# Company Portal Login Test Script (PowerShell)
# This script tests the complete login flow

Write-Host "Company Portal Login System Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health
Write-Host "Test 1: Checking Backend Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing
    if ($healthResponse.Content -match "ok") {
        Write-Host "[OK] Backend is running on port 5000" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Backend is NOT responding" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Backend is NOT responding: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Backend API - Company Login
Write-Host "Test 2: Testing Company Login API..." -ForegroundColor Yellow
try {
    $body = '{"email":"rajesh@foodies.com","password":"Company123"}'
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/company-auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    if ($loginResponse.Content -match "Foodies Pvt Ltd") {
        Write-Host "[OK] Backend login endpoint works" -ForegroundColor Green
        $json = $loginResponse.Content | ConvertFrom-Json
        Write-Host "    Company: $($json.company.name)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Backend login endpoint failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Backend login failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Frontend Server
Write-Host "Test 3: Checking Frontend Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Frontend is running on port 3001" -ForegroundColor Green
    } else {
        Write-Host ("[FAIL] Frontend NOT responding, Status: {0}" -f $response.StatusCode) -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Frontend is NOT responding" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Frontend API Proxy
Write-Host "Test 4: Testing Frontend API Proxy..." -ForegroundColor Yellow
try {
    $body = '{"email":"priya@deliverit.com","password":"Company123"}'
    $proxyResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/company-auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    
    if ($proxyResponse.Content -match "DeliverIt") {
        Write-Host "[OK] Frontend proxy to backend works" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Frontend proxy failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Frontend proxy failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 5: Environment Check
Write-Host "Test 5: Checking Environment Files..." -ForegroundColor Yellow
if (Test-Path "company-portal\.env") {
    Write-Host "[OK] company-portal\.env exists" -ForegroundColor Green
    $envContent = Get-Content "company-portal\.env"
    Write-Host "    Content: $envContent" -ForegroundColor Green
} else {
    Write-Host "[FAIL] company-portal\.env NOT FOUND" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "All checks passed! Ready to test login." -ForegroundColor Green
Write-Host "Open: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Email: rajesh@foodies.com" -ForegroundColor Cyan
Write-Host "Password: Company123" -ForegroundColor Cyan
