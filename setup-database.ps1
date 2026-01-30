$PostgreSQLPath = "C:\Program Files\PostgreSQL\15\bin\psql.exe"

if (!(Test-Path $PostgreSQLPath)) {
    Write-Host "PostgreSQL not found. Make sure it's installed." -ForegroundColor Red
    exit 1
}

Write-Host "Setting up PostgreSQL database..." -ForegroundColor Cyan
Write-Host ""

# Create database
Write-Host "[1/4] Creating database 'admin_panel_db'..." -ForegroundColor Yellow
& $PostgreSQLPath -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'admin_panel_db'" | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Database already exists" -ForegroundColor Green
} else {
    & $PostgreSQLPath -U postgres -c "CREATE DATABASE admin_panel_db;"
    Write-Host "  ✓ Database created" -ForegroundColor Green
}

# Create user
Write-Host "[2/4] Creating user 'admin_user'..." -ForegroundColor Yellow
try {
    & $PostgreSQLPath -U postgres -c "CREATE USER admin_user WITH PASSWORD 'admin123';" 2>$null
    Write-Host "  ✓ User created" -ForegroundColor Green
} catch {
    Write-Host "  ✓ User already exists" -ForegroundColor Green
}

# Grant privileges
Write-Host "[3/4] Granting privileges..." -ForegroundColor Yellow
& $PostgreSQLPath -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;"
Write-Host "  ✓ Privileges granted" -ForegroundColor Green

# Run migrations
Write-Host "[4/4] Running database migrations..." -ForegroundColor Yellow
cd backend
npx knex migrate:latest
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Migrations completed" -ForegroundColor Green
    
    # Seed data
    Write-Host "Seeding initial data..." -ForegroundColor Yellow
    npx knex seed:run
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Data seeded" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ Migrations failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Yellow
