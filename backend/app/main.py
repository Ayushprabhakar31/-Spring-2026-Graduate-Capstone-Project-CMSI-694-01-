from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from uuid import uuid4
from collections import defaultdict
from datetime import datetime
import time
import sqlite3
import redis
import os
import socket

# --------------------------------------------------
# FastAPI App
# --------------------------------------------------

app = FastAPI(title="Distributed API Gateway")

# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Redis Setup (Docker Safe)
# --------------------------------------------------

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=6379,
    decode_responses=True
)

# --------------------------------------------------
# SQLite Setup
# --------------------------------------------------

DB_PATH = "traffic.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS traffic_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            api_key TEXT,
            endpoint TEXT,
            latency_ms REAL,
            rate_limited INTEGER
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --------------------------------------------------
# API Key Storage (In-memory)
# --------------------------------------------------

api_keys = {}

# --------------------------------------------------
# Rate Limiting Config
# --------------------------------------------------

RATE_LIMIT = 10
WINDOW_SIZE = 60

# --------------------------------------------------
# Metrics
# --------------------------------------------------

traffic_metrics = {
    "total_requests": 0,
    "rate_limited_requests": 0,
    "success_count": 0,
    "server_errors": 0,
    "endpoint_hits": defaultdict(int),
    "client_usage": defaultdict(int),
    "latencies": []
}

MAX_LATENCY_STORE = 1000  # prevent memory leak

# --------------------------------------------------
# Helper: Log to SQLite
# --------------------------------------------------

def log_traffic(api_key, endpoint, latency_ms, rate_limited):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO traffic_logs VALUES (NULL, ?, ?, ?, ?, ?)",
        (
            datetime.utcnow().isoformat(),
            api_key,
            endpoint,
            latency_ms,
            rate_limited
        )
    )
    conn.commit()
    conn.close()

# --------------------------------------------------
# Middleware
# --------------------------------------------------

@app.middleware("http")
async def intelligent_gateway(request: Request, call_next):

    start_time = time.time()
    endpoint = request.url.path

    public_routes = [
        "/register",
        "/metrics",
        "/health",
        "/docs",
        "/openapi.json",
        "/favicon.ico"
    ]

    traffic_metrics["total_requests"] += 1
    traffic_metrics["endpoint_hits"][endpoint] += 1

    # ------------------------
    # PUBLIC ROUTES
    # ------------------------

    if endpoint in public_routes:
        response = await call_next(request)
        latency = (time.time() - start_time) * 1000
        traffic_metrics["latencies"].append(latency)
        traffic_metrics["latencies"] = traffic_metrics["latencies"][-MAX_LATENCY_STORE:]
        return response

    # ------------------------
    # API KEY VALIDATION
    # ------------------------

    api_key = request.headers.get("x-api-key")

    if not api_key:
        return JSONResponse(status_code=401, content={"detail": "Missing API key"})

    if api_key not in api_keys:
        return JSONResponse(status_code=403, content={"detail": "Invalid API key"})

    traffic_metrics["client_usage"][api_key] += 1

    # ------------------------
    # RATE LIMITING (Redis)
    # ------------------------

    redis_key = f"rate_limit:{api_key}:{endpoint}"

    try:
        current_count = redis_client.get(redis_key)

        if current_count and int(current_count) >= RATE_LIMIT:
            traffic_metrics["rate_limited_requests"] += 1
            log_traffic(api_key, endpoint, 0, 1)
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

        pipe = redis_client.pipeline()
        pipe.incr(redis_key)
        pipe.expire(redis_key, WINDOW_SIZE)
        pipe.execute()

    except redis.exceptions.ConnectionError:
        # If Redis fails, allow request but log error
        traffic_metrics["server_errors"] += 1

    # ------------------------
    # PROCESS REQUEST
    # ------------------------

    response = await call_next(request)

    latency = (time.time() - start_time) * 1000
    traffic_metrics["latencies"].append(latency)
    traffic_metrics["latencies"] = traffic_metrics["latencies"][-MAX_LATENCY_STORE:]

    if response.status_code >= 500:
        traffic_metrics["server_errors"] += 1
    else:
        traffic_metrics["success_count"] += 1

    log_traffic(api_key, endpoint, latency, 0)

    return response

# --------------------------------------------------
# Register API Key
# --------------------------------------------------

@app.post("/register")
def register_client():
    new_key = str(uuid4())
    api_keys[new_key] = {
        "created_at": datetime.utcnow().isoformat()
    }
    return {"api_key": new_key}

# --------------------------------------------------
# Protected Route
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "API Gateway Running",
        "container": socket.gethostname()
    }

# --------------------------------------------------
# Health Endpoint
# --------------------------------------------------

@app.get("/health")
def health():
    try:
        redis_status = redis_client.ping()
    except:
        redis_status = False

    return {
        "status": "healthy",
        "redis_connected": redis_status,
        "active_api_keys": len(api_keys)
    }

# --------------------------------------------------
# Metrics Endpoint
# --------------------------------------------------

@app.get("/metrics")
def metrics():

    latencies = sorted(traffic_metrics["latencies"])

    if latencies:
        index = max(int(len(latencies) * 0.95) - 1, 0)
        p95 = latencies[index]
        avg_latency = sum(latencies) / len(latencies)
    else:
        p95 = 0
        avg_latency = 0

    return {
        "total_requests": traffic_metrics["total_requests"],
        "rate_limited_requests": traffic_metrics["rate_limited_requests"],
        "success_count": traffic_metrics["success_count"],
        "server_errors": traffic_metrics["server_errors"],
        "average_latency_ms": round(avg_latency, 2),
        "p95_latency_ms": round(p95, 2),
        "endpoint_hits": dict(traffic_metrics["endpoint_hits"]),
        "client_usage": dict(traffic_metrics["client_usage"])
    }