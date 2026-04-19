#!/usr/bin/env bash

cd "$(dirname "$0")"

if ! [[ -d "data/" ]]; then mkdir "data"; fi
if [[ -f "users.json" ]]; then mv "users.json" "data/users.json"; fi
if [[ -f "templates.json" ]]; then mv "templates.json" "data/templates.json"; fi

if ! [[ -d "node_modules/" || "$NEED_INSTALL" == 1 ]]; then
  echo [setup] Installing dependencies…
  if [[ -f "package-lock.json" ]]; then
    npm ci
  else
    npm install
  fi
else
  npm ls --depth=1 &>/dev/null
  if [[ $? != 0 ]]; then NEED_INSTALL=1; fi
fi

echo [run] Starting backend and frontend...
echo "Starting backend on port 3000..."
npx tsx watch --env-file=.env src/server.ts &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo "Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo "Both services started. Press Ctrl+C to stop."
wait $BACKEND_PID
wait $FRONTEND_PID
