@echo off
setlocal

REM Change to the directory containing this script
cd /d "%~dp0"

set BACKEND_PORT=3000
set FRONTEND_PORT=5173

echo [wind-st] Installing backend deps...
pushd backend
if not exist "package.json" (
  echo [wind-st] backend/package.json not found. Please run this script from the repo root.
  pause
  exit /b 1
)
npm install
echo [wind-st] Starting backend on port %BACKEND_PORT% ...
start "wind-st backend" cmd /c "set PORT=%BACKEND_PORT% && npm run dev"
popd

echo [wind-st] Installing frontend deps...
pushd frontend
if not exist "package.json" (
  echo [wind-st] frontend/package.json not found. Please run this script from the repo root.
  pause
  exit /b 1
)
npm install
echo [wind-st] Starting frontend on port %FRONTEND_PORT% ...
start "wind-st frontend" cmd /c "npm run dev -- --port %FRONTEND_PORT%"
popd

echo.
echo [wind-st] Frontend: http://localhost:%FRONTEND_PORT%
echo [wind-st] API via proxy: /api -> http://localhost:%BACKEND_PORT%
echo.
echo Close this window anytime; servers run in separate windows.
pause

