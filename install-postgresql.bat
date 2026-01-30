@echo off
REM PostgreSQL Installation Batch Script
REM Run this script as Administrator

echo.
echo ========================================
echo PostgreSQL Installation Script
echo ========================================
echo.

setlocal enabledelayedexpansion

REM Step 1: Download PostgreSQL
echo [Step 1] Downloading PostgreSQL installer...
powershell -Command "Invoke-WebRequest -Uri 'https://get.enterprisedb.com/postgresql/postgresql-15.4-1-windows-x64.exe' -OutFile 'C:\postgresql-installer.exe'" 2>nul

if exist "C:\postgresql-installer.exe" (
    echo Download successful!
) else (
    echo Failed to download PostgreSQL
    echo Please download manually from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo.
echo [Step 2] Running PostgreSQL installer...
echo Please follow the installation wizard:
echo - Port: 5432
echo - Superuser password: admin123
echo - Service password: admin123
echo.

REM Run the installer
C:\postgresql-installer.exe

echo.
echo [Step 3] Verifying installation...
timeout /t 3

REM Try to run psql
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo PostgreSQL installed successfully!
) else (
    echo Trying to add PostgreSQL to PATH...
    setx PATH "%PATH%;C:\Program Files\PostgreSQL\15\bin"
    echo Please restart PowerShell and try again
)

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Run these commands to create the database:
echo    psql -U postgres -c "CREATE DATABASE admin_panel_db;"
echo    psql -U postgres -c "CREATE USER admin_user WITH PASSWORD 'admin123';"
echo    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;"
echo.
echo 2. Or run from backend folder:
echo    cd backend
echo    npm run migrate
echo.
echo ========================================
echo.

del "C:\postgresql-installer.exe" 2>nul

pause
