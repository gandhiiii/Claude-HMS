@echo off
title HMS WebSocket Notification Server
color 0A
echo.
echo  ================================================
echo   HMS WebSocket Notification Server
echo  ================================================
echo.

:: Check if node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Install ws package if node_modules\ws doesn't exist
if not exist "node_modules\ws" (
    echo  Installing dependencies...
    npm install --omit=dev
    echo.
)

echo  Starting server on ws://localhost:8765
echo  Press Ctrl+C to stop.
echo.
node server\ws-server.js
pause
