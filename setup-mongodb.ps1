# MongoDB Setup Script for Windows (PowerShell)
# Automatically sets up the project with MongoDB

Write-Host ""
Write-Host "============================================"
Write-Host "  Admin Panel - MongoDB Setup" -ForegroundColor Green
Write-Host "============================================"
Write-Host ""

# Check if Node.js is installed
$nodeCheck = cmd /c "node --version 2>nul"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[INFO] Node.js version: $nodeCheck" -ForegroundColor Cyan

# Check if MongoDB is running
Write-Host "[INFO] Checking MongoDB connection..." -ForegroundColor Cyan
$mongoCheck = cmd /c "mongosh --eval 'db.version()' 2>nul"
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] MongoDB server not detected on localhost:27017" -ForegroundColor Yellow
    Write-Host "[INFO] Make sure MongoDB is running before continuing" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[STEP 1] Installing backend dependencies..." -ForegroundColor Cyan
Write-Host ""

Push-Location backend

if (Test-Path node_modules) {
    Write-Host "[INFO] Dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "Running: npm install" -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install backend dependencies" -ForegroundColor Red
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "[STEP 2] Checking for .env file..." -ForegroundColor Cyan

if (Test-Path .env) {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
} else {
    if (Test-Path .env.example) {
        Write-Host "[INFO] Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item .env.example .env
        Write-Host "[OK] .env created. Edit it if needed." -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Neither .env nor .env.example found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[STEP 3] Seeding database..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Running: npm run seed" -ForegroundColor Yellow
npm run seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Seed may have failed. Check MongoDB connection." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Database seeded successfully" -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "[STEP 4] Installing frontend dependencies..." -ForegroundColor Cyan
Write-Host ""

Push-Location frontend

if (Test-Path node_modules) {
    Write-Host "[INFO] Dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "Running: npm install" -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install frontend dependencies" -ForegroundColor Red
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Pop-Location

Write-Host ""
Write-Host "============================================"
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Make sure MongoDB is running"
Write-Host "  2. Open two terminals:"
Write-Host "     Terminal 1: cd backend && npm run dev"
Write-Host "     Terminal 2: cd frontend && npm run dev"
Write-Host "  3. Open http://localhost:3000"
Write-Host "  4. Login with: pragna@company.com / Test1234"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - START_HERE.md - Quick overview"
Write-Host "  - QUICK_REFERENCE.md - Common commands"
Write-Host "  - MONGODB_SETUP_GUIDE.md - Detailed reference"
Write-Host ""

Read-Host "Press Enter to exit"
exit 0
