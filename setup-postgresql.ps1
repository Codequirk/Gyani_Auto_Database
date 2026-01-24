# PostgreSQL Setup Script for Windows (PowerShell)
# This script sets up PostgreSQL database and backend for the Auto Database project

Write-Host ""
Write-Host "============================================"
Write-Host "  Auto Database - PostgreSQL Setup" -ForegroundColor Green
Write-Host "============================================"
Write-Host ""

# Check if Node.js is installed
$nodeCheck = cmd /c "node --version 2>nul"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Node.js version: $nodeCheck" -ForegroundColor Green

# Check if PostgreSQL is installed
Write-Host ""
Write-Host "[STEP 1] Checking PostgreSQL installation..." -ForegroundColor Cyan
$postgresCheck = cmd /c "psql --version 2>nul"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] PostgreSQL is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "PLEASE INSTALL POSTGRESQL FIRST:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Install PostgreSQL 14 or 15" -ForegroundColor White
    Write-Host "3. Set password to: admin123" -ForegroundColor White
    Write-Host "4. Keep port: 5432" -ForegroundColor White
    Write-Host "5. Check 'Install pgAdmin'" -ForegroundColor White
    Write-Host "6. After installation, re-run this script" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] PostgreSQL version: $postgresCheck" -ForegroundColor Green

# Check if PostgreSQL service is running
Write-Host ""
Write-Host "[STEP 2] Checking PostgreSQL service..." -ForegroundColor Cyan
$serviceCheck = Get-Service | Where-Object { $_.Name -like "*postgres*" } | Select-Object -First 1

if ($null -eq $serviceCheck) {
    Write-Host "[WARNING] PostgreSQL service not found" -ForegroundColor Yellow
    Write-Host "You may need to start PostgreSQL manually" -ForegroundColor Yellow
} else {
    Write-Host "[OK] PostgreSQL service found: $($serviceCheck.Name)" -ForegroundColor Green
    if ($serviceCheck.Status -ne "Running") {
        Write-Host "[INFO] Starting PostgreSQL service..." -ForegroundColor Cyan
        Start-Service -Name $serviceCheck.Name -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "[OK] Service started" -ForegroundColor Green
    } else {
        Write-Host "[OK] PostgreSQL service is already running" -ForegroundColor Green
    }
}

# Now setup the database
Write-Host ""
Write-Host "[STEP 3] Creating database and user..." -ForegroundColor Cyan

# SQL commands to execute
$createDbCommand = "CREATE DATABASE admin_panel_db;"
$createUserCommand = "CREATE USER admin_user WITH PASSWORD 'admin123';"
$alterRoleCommand = @"
ALTER ROLE admin_user SET client_encoding TO 'utf8';
ALTER ROLE admin_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE admin_user SET default_transaction_deferrable TO on;
"@
$grantPrivilegesCommand = "GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;"

# Execute commands
try {
    Write-Host "  Creating database..." -ForegroundColor White
    psql -U postgres -c $createDbCommand 2>&1 | Where-Object { $_ -notmatch "already exists" } | ForEach-Object { Write-Host "    $_" }
    
    Write-Host "  Creating user..." -ForegroundColor White
    psql -U postgres -c $createUserCommand 2>&1 | Where-Object { $_ -notmatch "already exists" } | ForEach-Object { Write-Host "    $_" }
    
    Write-Host "  Setting user roles..." -ForegroundColor White
    psql -U postgres -c $alterRoleCommand 2>&1 | Where-Object { $_ -notmatch "already exists" } | ForEach-Object { Write-Host "    $_" }
    
    Write-Host "  Granting privileges..." -ForegroundColor White
    psql -U postgres -c $grantPrivilegesCommand 2>&1 | Where-Object { $_ -notmatch "already exists" } | ForEach-Object { Write-Host "    $_" }
    
    Write-Host "[OK] Database and user created" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Error during database setup: $_" -ForegroundColor Yellow
    Write-Host "You may need to create the database manually" -ForegroundColor Yellow
}

# Setup backend
Write-Host ""
Write-Host "[STEP 4] Setting up backend..." -ForegroundColor Cyan
Push-Location backend

# Check .env file
if (Test-Path .env) {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
} else {
    Write-Host "[INFO] Creating .env file..." -ForegroundColor Cyan
    @"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_panel_db
DB_USER=admin_user
DB_PASSWORD=admin123
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
LOG_LEVEL=debug
"@ | Out-File -Encoding UTF8 .env
    Write-Host "[OK] .env file created" -ForegroundColor Green
}

# Install dependencies if needed
if (Test-Path node_modules) {
    Write-Host "[OK] Dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "[INFO] Installing npm dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
}

Pop-Location

# Run migrations
Write-Host ""
Write-Host "[STEP 5] Running database migrations..." -ForegroundColor Cyan
Push-Location backend

try {
    Write-Host "  Running migrations..." -ForegroundColor White
    npx knex migrate:latest 2>&1
    Write-Host "[OK] Migrations completed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Migration failed: $_" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}

# Seed database
Write-Host ""
Write-Host "[STEP 6] Seeding initial data..." -ForegroundColor Cyan
try {
    Write-Host "  Running seeds..." -ForegroundColor White
    npx knex seed:run 2>&1
    Write-Host "[OK] Seeds completed" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Seed may have failed, but database might still be functional" -ForegroundColor Yellow
}

Pop-Location

# Summary
Write-Host ""
Write-Host "============================================"
Write-Host "  ✅ PostgreSQL Migration Complete!" -ForegroundColor Green
Write-Host "============================================"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start backend:        cd backend && npm run dev" -ForegroundColor White
Write-Host "2. Start company portal: cd company-portal && npm run dev" -ForegroundColor White
Write-Host "3. Start frontend:       cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Test the API:            curl http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "Enjoy! 🚀" -ForegroundColor Green
Write-Host ""
