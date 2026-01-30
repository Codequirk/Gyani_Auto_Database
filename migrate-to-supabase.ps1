# Migrate PostgreSQL data from Local to Supabase
Write-Host "=== PostgreSQL to Supabase Migration ===" -ForegroundColor Green
Write-Host ""

# Detect PostgreSQL installation
$pgVersions = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue | Sort-Object Name -Descending
if ($pgVersions.Count -eq 0) {
    Write-Host "[ERROR] PostgreSQL is not installed!" -ForegroundColor Red
    exit 1
}
$pgVersion = $pgVersions[0].Name
$pgPath = "C:\Program Files\PostgreSQL\$pgVersion\bin"
Write-Host "[INFO] Using PostgreSQL $pgVersion at $pgPath" -ForegroundColor Yellow

# Local PostgreSQL credentials
$LOCAL_HOST = "localhost"
$LOCAL_PORT = "5432"
$LOCAL_USER = "postgres"
$LOCAL_PASSWORD = "sr476602"
$LOCAL_DB = "admin_panel_db"

# Supabase PostgreSQL credentials
$SUPABASE_HOST = "db.vdppfeswuqljrwilibqr.supabase.co"
$SUPABASE_PORT = "5432"
$SUPABASE_USER = "postgres"
$SUPABASE_PASSWORD = "Mt1yzJ5gaeqiRpO9"
$SUPABASE_DB = "postgres"

# Set PostgreSQL password environment variable for local connection
$env:PGPASSWORD = $LOCAL_PASSWORD

Write-Host "[STEP 1] Dumping data from local PostgreSQL..." -ForegroundColor Cyan
$dumpFile = "C:\temp\database_dump.sql"

# Create temp directory if it doesn't exist
if (-not (Test-Path "C:\temp")) {
    New-Item -ItemType Directory -Path "C:\temp" | Out-Null
}

# Dump the database
Write-Host "  Dumping from: $LOCAL_HOST`:$LOCAL_PORT/$LOCAL_DB" -ForegroundColor White
try {
    & "$pgPath\pg_dump" -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB --no-password > $dumpFile
    Write-Host "  [OK] Dump completed: $dumpFile" -ForegroundColor Green
    $fileSize = (Get-Item $dumpFile).Length / 1MB
    Write-Host "  [OK] Dump file size: $([Math]::Round($fileSize, 2)) MB" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Error during dump: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[STEP 2] Connecting to Supabase PostgreSQL..." -ForegroundColor Cyan
$env:PGPASSWORD = $SUPABASE_PASSWORD

Write-Host "  Testing connection to: $SUPABASE_HOST`:$SUPABASE_PORT" -ForegroundColor White
try {
    & "$pgPath\psql" -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -c "SELECT version();" --no-password
    Write-Host "  [OK] Connected to Supabase successfully" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Connection failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[STEP 3] Restoring data to Supabase..." -ForegroundColor Cyan
Write-Host "  WARNING: This will restore all tables and data to Supabase" -ForegroundColor Yellow
Write-Host "  Press Enter to continue or Ctrl+C to cancel..."
Read-Host

try {
    & "$pgPath\psql" -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -f $dumpFile --no-password
    Write-Host "  [OK] Data restored successfully to Supabase" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Error during restore: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[STEP 4] Verifying migration..." -ForegroundColor Cyan

try {
    & "$pgPath\psql" -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -c "\dt" --no-password
    Write-Host "  [OK] Tables in Supabase verified" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Verification failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Migration Complete ===" -ForegroundColor Green
Write-Host "Your data has been migrated to Supabase!" -ForegroundColor Green
