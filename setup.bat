@echo off
echo Admin Panel - Complete Setup
echo ============================
echo.

echo Step 1: Checking PostgreSQL...
where createdb >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL not found. Please install PostgreSQL first.
    exit /b 1
)

echo Creating database...
createdb admin_panel_db 2>nul || echo Database may already exist

echo.
echo Step 2: Setting up backend...
cd backend

if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)

if not exist ".env" (
    copy .env.example .env
    echo Created .env file. Please update with your credentials.
)

echo Running database migrations...
call npm run migrate

echo Seeding database with initial data...
call npm run seed

echo.
echo Backend setup complete!
echo.

echo Step 3: Setting up frontend...
cd ..\frontend

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

if not exist ".env" (
    copy .env.example .env
)

echo.
echo Frontend setup complete!
echo.

echo ============================
echo Setup Complete!
echo.
echo To start the application:
echo 1. Terminal 1: cd backend ^&^& npm run dev
echo 2. Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo.
echo Default Login:
echo Email: pragna@company.com
echo Password: Test1234
