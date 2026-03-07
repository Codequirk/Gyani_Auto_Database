# Dual Portal Startup Script - Windows PowerShell
# Starts both Admin Portal (port 3000) and Company Portal (port 3001)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Gyani Auto Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Color codes for output
$successColor = "Green"
$errorColor = "Red"
$infoColor = "Cyan"

# Check if MongoDB is running
Write-Host "Checking MongoDB..." -ForegroundColor $infoColor
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "✓ MongoDB is running" -ForegroundColor $successColor
} else {
    Write-Host "✗ MongoDB is NOT running. Starting MongoDB..." -ForegroundColor $errorColor
    net start MongoDB
    Start-Sleep -Seconds 3
}

# Start Backend
Write-Host ""
Write-Host "Starting Backend Server (Port 5000)..." -ForegroundColor $infoColor
Push-Location "backend"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Pop-Location
Start-Sleep -Seconds 3

# Start Admin Frontend
Write-Host "Starting Admin Portal (Port 3000)..." -ForegroundColor $infoColor
Push-Location "frontend"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Pop-Location
Start-Sleep -Seconds 3

# Start Company Portal
Write-Host "Starting Company Portal (Port 3001)..." -ForegroundColor $infoColor
Push-Location "company-portal"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ All services started successfully!" -ForegroundColor $successColor
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Backend:          http://localhost:5000" -ForegroundColor $infoColor
Write-Host "👨‍💼 Admin Portal:      http://localhost:3000" -ForegroundColor $infoColor
Write-Host "🏢 Company Portal:    http://localhost:3001" -ForegroundColor $infoColor
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""
