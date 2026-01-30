@echo off
REM Create PostgreSQL Database and User

echo.
echo ========================================
echo PostgreSQL Database Setup
echo ========================================
echo.

REM Set PostgreSQL installation path
set PSQL_PATH=C:\Program Files\PostgreSQL\15\bin\psql.exe

REM Check if psql exists
if not exist "%PSQL_PATH%" (
    echo Error: PostgreSQL not found at %PSQL_PATH%
    echo Please install PostgreSQL first
    pause
    exit /b 1
)

echo [Step 1] Creating database...
"%PSQL_PATH%" -U postgres -c "CREATE DATABASE admin_panel_db;" 2>nul

echo [Step 2] Creating user...
"%PSQL_PATH%" -U postgres -c "CREATE USER admin_user WITH PASSWORD 'admin123';" 2>nul

echo [Step 3] Granting privileges...
"%PSQL_PATH%" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;" 2>nul

echo [Step 4] Running migrations...
cd ..\backend
call npx knex migrate:latest

echo [Step 5] Seeding database...
call npx knex seed:run

echo.
echo ========================================
echo Database setup complete!
echo ========================================
echo.
pause
