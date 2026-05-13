# PulseOps

PulseOps is my graduate capstone project. It started as a rate-limiting and suspicious-traffic project, then grew into a larger security operations platform with live telemetry, AI-assisted analysis, automation, and reporting.

This README is meant to help someone else run the project without needing extra context.

## Live links

- Public frontend: [https://ayushprabhakar31.github.io/-Spring-2026-Graduate-Capstone-Project-CMSI-694-01-/](https://ayushprabhakar31.github.io/-Spring-2026-Graduate-Capstone-Project-CMSI-694-01-/)
- Hosted backend: [https://pulseops-ayush-backend.fly.dev](https://pulseops-ayush-backend.fly.dev)
- Backend health check: [https://pulseops-ayush-backend.fly.dev/health](https://pulseops-ayush-backend.fly.dev/health)

## Main features

- live dashboard for traffic, latency, and system posture
- website monitoring and telemetry collection
- suspicious traffic and rate-limit style signal detection
- AI-based analysis and chat workflows
- automation rules
- reporting and export views
- admin tools for sites, webhooks, and runtime settings

## Tech stack

### Frontend

- React `18.2.0`
- React Scripts `5.0.1`
- Recharts `3.8.1`

### Backend

- Node.js
- Express `5.2.1`
- CORS `2.8.6`
- better-sqlite3 `12.8.0`
- Redis client `5.11.0` optional
- SQLite

## Recommended versions

These are the versions I recommend for the least setup trouble:

- Node.js `20.x LTS` or `22.x LTS`
- npm `10.x` or newer

Minimum:

- Node.js `18+`

## Requirements

- macOS, Linux, or Windows
- Node.js installed
- npm installed

Optional:

- OpenAI API key if you want live OpenAI responses
- Fly.io or Render account if you want to deploy it

## Project structure

```text
capstone-project/
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── package.json
│       ├── pulseops.db
│       ├── Dockerfile
│       ├── fly.toml
│       └── docker-entrypoint.sh
├── frontend/
│   ├── package.json
│   └── src/
├── presentation/
├── FINAL_PROJECT_REPORT_DRAFT.md
├── FINAL_PRESENTATION_DRAFT.md
└── PulseOps-Final-Presentation.pptx
```

## Environment variables

Backend env file:

- [backend/.env](/Users/Ayush/Desktop/capstone-project/backend/.env)

Example:

```env
OPENAI_API_KEY=YOUR_ACTUAL_OPENAI_KEY
OPENAI_MODEL=gpt-5-mini
PORT=9000
```

### Needed

- `PORT`

### Optional

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `HOST`
- `DB_PATH`
- `ENABLE_REDIS`
- `REDIS_HOST`
- `REDIS_PORT`
- `PUBLIC_BASE_URL`

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/Ayushprabhakar31/-Spring-2026-Graduate-Capstone-Project-CMSI-694-01-.git
cd -Spring-2026-Graduate-Capstone-Project-CMSI-694-01-
```

### 2. Install backend packages

```bash
cd backend
npm install
```

### 3. Install frontend packages

```bash
cd ../frontend
npm install
```

## Running locally

There are two parts to run:

- backend on port `9000`
- frontend on port `3000`

### Start the backend

```bash
cd backend
npm start
```

You should see:

```bash
Backend running at http://localhost:9000
```

### Start the frontend

Open a second terminal:

```bash
cd frontend
npm start
```

### Open the app

- frontend: [http://localhost:3000](http://localhost:3000)
- backend health: [http://localhost:9000/health](http://localhost:9000/health)

## Local login

### Demo account

- Email: `demo@pulseops.ai`
- Password: `pulseops-demo`

### Create account

Create account works when the backend is running locally.

### Demo mode

If you just need to present the project quickly, use:

- `Continue in Demo Mode`

## Real-time traffic

The project can use:

### Real traffic

- browser snippet telemetry
- `/api/collect`
- imported log events

### Built-in demo traffic

If no real website is connected, the backend can generate demo traffic automatically so the dashboard still moves during a demo.

That means you should still see:

- live activity
- changing latency and error values
- suspicious events
- risk or threat changes

## Showing live updates

Start the backend and frontend locally first.

Then open:

- [http://localhost:3000](http://localhost:3000)

The frontend listens to:

- `/api/metrics/realtime`
- `/api/home/realtime`

If the stream drops, it falls back to polling.

### Trigger a visible spike

```bash
curl -X POST http://localhost:9000/api/demo/spike
```

### Change the demo scenario

```bash
curl -X POST http://localhost:9000/api/demo/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario":"bots"}'
```

Available scenarios:

- `normal`
- `latency`
- `auth`
- `bots`
- `cascade`

## Connecting a real website

To connect a real site:

1. Open `Website Monitor`
2. Register a site
3. Copy the collector snippet
4. Add the snippet to your website
5. Let it send telemetry into `/api/collect`

Useful endpoints:

- `POST /api/sites/register`
- `GET /api/sites/:siteKey/snippet`
- `POST /api/collect`

## Important API endpoints

### Health

- `GET /health`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Dashboard and realtime

- `GET /api/dashboard/snapshot`
- `GET /api/metrics/realtime`
- `GET /api/home/summary`
- `GET /api/home/realtime`

### Sites

- `GET /api/sites`
- `POST /api/sites/register`
- `GET /api/sites/:siteKey/overview`
- `GET /api/sites/:siteKey/snippet`
- `POST /api/sites/:siteKey/runtime-config`
- `POST /api/sites/:siteKey/edge-config`

### Demo

- `POST /api/demo/spike`
- `POST /api/demo/scenario`

### Automation

- `GET /api/automation/overview`
- `POST /api/automation/rules`
- `POST /api/automation/evaluate`

## Build commands

### Frontend build

```bash
cd frontend
npm run build
```

### Backend syntax check

```bash
cd /Users/Ayush/Desktop/capstone-project
node --check backend/src/server.js
```

## Test command

```bash
cd frontend
CI=true npm test -- --watch=false
```

## Deployment

### Render

This repo includes:

- [render.yaml](/Users/Ayush/Desktop/capstone-project/render.yaml)

It is set up to provision:

- `pulseops-backend`
- `pulseops-frontend`

Deploy button:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ayushprabhakar31/-Spring-2026-Graduate-Capstone-Project-CMSI-694-01-.git)

### Fly.io

Fly backend files:

- [backend/src/fly.toml](/Users/Ayush/Desktop/capstone-project/backend/src/fly.toml)
- [backend/src/Dockerfile](/Users/Ayush/Desktop/capstone-project/backend/src/Dockerfile)

## Presentation files

- [PulseOps-Final-Presentation.pptx](/Users/Ayush/Desktop/capstone-project/PulseOps-Final-Presentation.pptx)
- [FINAL_PRESENTATION_DRAFT.md](/Users/Ayush/Desktop/capstone-project/FINAL_PRESENTATION_DRAFT.md)
- [FINAL_PROJECT_REPORT_DRAFT.md](/Users/Ayush/Desktop/capstone-project/FINAL_PROJECT_REPORT_DRAFT.md)

## Troubleshooting

### `npm start` does not work in backend

Use:

```bash
cd backend
npm start
```

### Create account does not work

Check that:

- the backend is running locally on `http://localhost:9000`
- you are using the local frontend
- the public backend is not down

### Public site says backend is unavailable

That usually means the hosted backend is offline. For a reliable demo, run the project locally.

### Charts are not moving

Check that:

- backend is running
- frontend is connected to `localhost:9000`
- demo traffic is enabled
- the site is not set to `live_only` without a real telemetry source

You can always force activity with:

```bash
curl -X POST http://localhost:9000/api/demo/spike
```

### Port already in use

Stop an old backend process:

```bash
pkill -f "node src/server.js"
```

Then restart:

```bash
cd backend
npm start
```

## Project background

This project started as a rate-limiting and suspicious-traffic idea. Over the semester, it expanded into a broader observability and operations platform. That change in scope is part of the real project story and explains why the final system includes monitoring, response workflows, automation, and reporting instead of only one backend feature.
