@echo off
chcp 65001 >nul
title QuizArena - Live Quiz Platform
color 0B

echo ============================================================
echo   QuizArena - Live Host-Run Quiz Platform
echo ============================================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please download and install Node.js [v18+ recommended] from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check npm installation
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm is not found in your PATH.
    pause
    exit /b 1
)

:: Check if node_modules exists, otherwise install dependencies
if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Running npm install...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] npm install failed. Please check your internet connection or npm permissions.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed successfully.
    echo.
)

:: Free up ports 3001 and 5173 if lingering from a previous session
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do taskkill /f /pid %%a >nul 2>&1

echo [INFO] Starting QuizArena Backend [Port 3001] and Frontend [Port 5173]...
echo.
echo   Host Dashboard : http://localhost:5173/
echo   Player Join    : http://localhost:5173/join
echo.
echo Press Ctrl+C in this terminal window to stop all servers.
echo ============================================================
echo.

:: Automatically open browser after 3 seconds in background
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173/"

:: Launch both backend and frontend concurrently
call npm run dev

pause
