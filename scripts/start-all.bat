@echo off
REM Dual Portal Startup Script - Windows Batch
REM Starts Backend (5000), Admin Portal (3000), and Company Portal (3001)

echo.
echo ========================================
echo Starting Gyani Auto Database Setup
echo ========================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MongoDB is running
) else (
    echo [INFO] Starting MongoDB service...
    net start MongoDB
    timeout /t 3 /nobreak
)

echo.
echo Starting Backend (Port 5000)...
cd backend
start "Backend Server - Port 5000" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak

echo Starting Admin Portal (Port 3000)...
cd frontend
start "Admin Portal - Port 3000" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak

echo Starting Company Portal (Port 3001)...
cd company-portal
start "Company Portal - Port 3001" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo [SUCCESS] All services started!
echo ========================================
echo.
echo Backend:       http://localhost:5000
echo Admin Portal:  http://localhost:3000
echo Company Portal: http://localhost:3001
echo.
echo Each service is running in a separate window.
echo Close any window to stop that service.
echo.
pause
