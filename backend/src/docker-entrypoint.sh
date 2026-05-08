#!/bin/sh
set -eu

if [ -n "${DB_PATH:-}" ]; then
  DB_DIR="$(dirname "$DB_PATH")"
  mkdir -p "$DB_DIR"

  if [ ! -f "$DB_PATH" ] && [ -f "/app/pulseops.db" ]; then
    cp /app/pulseops.db "$DB_PATH"
  fi
fi

exec "$@"
