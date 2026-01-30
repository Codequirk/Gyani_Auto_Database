# PostgreSQL Installation Script for Windows

Write-Host "========================================" -ForegroundColor Green
Write-Host "PostgreSQL Installation Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 1: Download PostgreSQL Installer
Write-Host "[Step 1] Downloading PostgreSQL 15 installer..." -ForegroundColor Cyan
$PostgreSQLUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.4-1-windows-x64.exe"
$InstallerPath = "C:\postgresql-installer.exe"

try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $PostgreSQLUrl -OutFile $InstallerPath -ErrorAction Stop
    Write-Host "✓ PostgreSQL installer downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download PostgreSQL" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Download manually from:" -ForegroundColor Yellow
    Write-Host "https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Step 2: Run PostgreSQL installer with default options
Write-Host "[Step 2] Running PostgreSQL installer..." -ForegroundColor Cyan
Write-Host "This will install PostgreSQL with the following settings:" -ForegroundColor Yellow
Write-Host "  - Port: 5432" -ForegroundColor Yellow
Write-Host "  - Superuser: postgres" -ForegroundColor Yellow
Write-Host "  - Password: admin123" -ForegroundColor Yellow
Write-Host ""

try {
    # Run installer silently with parameters
    & $InstallerPath `
        --mode unattended `
        --unattendedmodeui minimal `
        --superpassword admin123 `
        --servicepassword admin123 `
        --superuser postgres `
        --servicename PostgreSQL15 `
        --serverport 5432 `
        --install_runtimes 1 `
        --locale en_US `
        --enable-components server,pgAdmin,stackbuilder
    
    Write-Host "✓ PostgreSQL installed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to run installer" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Wait for service to start
Write-Host "[Step 3] Waiting for PostgreSQL service to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Step 4: Verify PostgreSQL is running
Write-Host "[Step 4] Verifying PostgreSQL installation..." -ForegroundColor Cyan
try {
    $service = Get-Service -Name PostgreSQL15 -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq 'Running') {
        Write-Host "✓ PostgreSQL service is running" -ForegroundColor Green
    } else {
        Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
        Start-Service -Name PostgreSQL15
        Start-Sleep -Seconds 2
        Write-Host "✓ PostgreSQL service started" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Could not verify service status" -ForegroundColor Yellow
}

# Step 5: Add PostgreSQL to PATH
Write-Host "[Step 5] Adding PostgreSQL to PATH..." -ForegroundColor Cyan
$PostgreSQLBin = "C:\Program Files\PostgreSQL\15\bin"
if ((Test-Path $PostgreSQLBin) -and -not ($env:Path -contains $PostgreSQLBin)) {
    $env:Path += ";$PostgreSQLBin"
    [Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::Machine)
    Write-Host "✓ PostgreSQL added to PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Create database by running:" -ForegroundColor White
Write-Host "   psql -U postgres -c \"CREATE DATABASE admin_panel_db;\"" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Create database user:" -ForegroundColor White
Write-Host "   psql -U postgres -c \"CREATE USER admin_user WITH PASSWORD 'admin123';\"" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Grant privileges:" -ForegroundColor White
Write-Host "   psql -U postgres -c \"GRANT ALL PRIVILEGES ON DATABASE admin_panel_db TO admin_user;\"" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Or run the setup script:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Yellow
Write-Host "   npm run migrate" -ForegroundColor Yellow
Write-Host ""

# Cleanup
Remove-Item $InstallerPath -Force -ErrorAction SilentlyContinue

Write-Host "Press any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
