@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist "data\" mkdir "data"
if exist "users.json" move /Y "users.json" "data\users.json"
if exist "templates.json" move /Y "templates.json" "data\templates.json"

set NEED_INSTALL=0
if not exist "node_modules\" (
  set NEED_INSTALL=1
) else (
  call npm ls --depth=1 >nul 2>&1
  if errorlevel 1 set NEED_INSTALL=1
)

if %NEED_INSTALL%==1 (
  echo [setup] Installing dependencies…
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
)

call cls
echo [run] Starting backend and frontend in separate windows...
start "Backend" cmd /k "npx tsx watch --env-file=.env src/server.ts"
start "Frontend" cmd /k "cd frontend && npm run dev"
