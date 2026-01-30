$ProgressPreference = 'SilentlyContinue'
$url = 'https://get.enterprisedb.com/postgresql/postgresql-15.5-1-windows-x64.exe'
$output = "$env:USERPROFILE\Downloads\postgresql-installer.exe"

Write-Host "Downloading PostgreSQL..."
Write-Host "URL: $url"
Write-Host "Output: $output"

try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
    Write-Host "Installer saved to: $output"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Open File Explorer"
    Write-Host "2. Navigate to: $env:USERPROFILE\Downloads"
    Write-Host "3. Right-click postgresql-installer.exe"
    Write-Host "4. Select 'Run as administrator'"
    Write-Host "5. Use these settings:"
    Write-Host "   - Port: 5432"
    Write-Host "   - Password: admin123"
    Write-Host ""
} catch {
    Write-Host "Download failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual download:"
    Write-Host "Visit: https://www.postgresql.org/download/windows/"
    Write-Host "Download PostgreSQL 15 and run the installer"
}
