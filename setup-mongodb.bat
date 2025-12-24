@echo off
REM MongoDB Setup Script for Windows
REM Automatically sets up the project with MongoDB

echo.
echo ============================================
echo   Admin Panel - MongoDB Setup
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js version:
call node --version

REM Check if MongoDB is installed
where mongosh >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] MongoDB (mongosh) detected
) else (
    echo [WARNING] MongoDB CLI (mongosh) not detected
    echo [INFO] Ensure MongoDB server is running on localhost:27017
)

echo.
echo [STEP 1] Installing backend dependencies...
echo.
cd backend
if exist node_modules (
    echo [INFO] Dependencies already installed
) else (
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        cd ..
        pause
        exit /b 1
    )
)

echo.
echo [STEP 2] Checking for .env file...
if exist .env (
    echo [INFO] .env file found
) else (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env
    echo [IMPORTANT] Please edit .env file if using MongoDB Atlas (cloud)
    echo.
    timeout /t 3
)

REM Display current .env
echo [INFO] Current database configuration:
echo.
findstr "MONGODB_URI" .env
echo.

echo [STEP 3] Waiting for MongoDB server...
echo [INFO] Connecting to MongoDB on localhost:27017...
timeout /t 2

echo.
echo [STEP 4] Seeding database with initial data...
echo.
call npm run seed

if %errorlevel% neq 0 (
    echo [ERROR] Seed failed. Verify MongoDB is running
    echo.
    echo [HELP] To start MongoDB on Windows:
    echo   Option 1: net start MongoDB
    echo   Option 2: Start MongoDB from Services
    echo.
    cd ..
    pause
    exit /b 1
)

echo.
echo [STEP 5] Installing frontend dependencies...
echo.
cd ..\frontend
if exist node_modules (
    echo [INFO] Frontend dependencies already installed
) else (
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo   ✅ SETUP COMPLETE!
echo ============================================
echo.
echo [NEXT STEPS] Run in separate terminals:
echo.
echo   Terminal 1 (Backend):
echo   $ cd backend
echo   $ npm run dev
echo.
echo   Terminal 2 (Frontend):
echo   $ cd frontend
echo   $ npm run dev
echo.
echo [ACCESS]
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo [LOGIN CREDENTIALS]
echo   Email:    pragna@company.com
echo   Password: Test1234
echo.
echo [DOCUMENTATION]
echo   - Main Guide: README.md
echo   - Setup Guide: MONGODB_SETUP_GUIDE.md
echo   - API Reference: RUNBOOK.md
echo.
pause
