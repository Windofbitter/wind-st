@echo off
setlocal

cd /d "%~dp0"

set BACKEND_PORT=3000
set FRONTEND_PORT=5173

if not "%~1"=="" set BACKEND_PORT=%~1
if not "%~2"=="" set FRONTEND_PORT=%~2
set BACKEND_ORIGIN=http://localhost:%BACKEND_PORT%

echo [wind-st] Resetting backend deps...
pushd backend
if not exist "package.json" (
  echo [wind-st] backend/package.json not found. Please run this script from the repo root.
  popd
  exit /b 1
)
if exist "node_modules" (
  echo [wind-st] Removing backend\node_modules...
  rmdir /s /q node_modules 2>nul
)
echo [wind-st] Installing backend deps...
call npm ci
if errorlevel 1 (
  echo [wind-st] npm install failed in backend.
  popd
  exit /b 1
)
echo [wind-st] Starting backend on port %BACKEND_PORT% ...
start "wind-st backend" cmd /k "set PORT=%BACKEND_PORT% && npm run dev"
popd

echo [wind-st] Resetting frontend deps...
pushd frontend
if not exist "package.json" (
  echo [wind-st] frontend/package.json not found. Please run this script from the repo root.
  popd
  exit /b 1
)
if exist "node_modules" (
  echo [wind-st] Removing frontend\node_modules...
  rmdir /s /q node_modules 2>nul
)
echo [wind-st] Installing frontend deps...
call npm ci
if errorlevel 1 (
  echo [wind-st] npm install failed in frontend.
  popd
  exit /b 1
)
echo [wind-st] Starting frontend on port %FRONTEND_PORT% ...
start "wind-st frontend" cmd /k "set VITE_API_PROXY_TARGET=%BACKEND_ORIGIN% && npm run dev -- --port %FRONTEND_PORT%"
popd

echo.
echo [wind-st] Frontend: http://localhost:%FRONTEND_PORT%
echo [wind-st] API via proxy: /api -> http://localhost:%BACKEND_PORT%
echo.
echo Close this window anytime; servers run in separate windows.
pause
exit /b 0
