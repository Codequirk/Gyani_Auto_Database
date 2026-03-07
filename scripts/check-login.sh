#!/bin/bash
# Company Portal Login Test Script
# This script tests the complete login flow

echo "🔍 Company Portal Login System Check"
echo "======================================"
echo ""

# Test 1: Backend Health
echo "1️⃣ Checking Backend Health..."
HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Backend is running on port 5000"
else
    echo "❌ Backend is NOT responding"
    exit 1
fi
echo ""

# Test 2: Backend API - Company Login
echo "2️⃣ Testing Company Login API Endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/company-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh@foodies.com","password":"Company123"}')

if echo "$LOGIN_RESPONSE" | grep -q "Foodies Pvt Ltd"; then
    echo "✅ Backend login endpoint works"
    COMPANY_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Company ID: $COMPANY_ID"
else
    echo "❌ Backend login endpoint failed"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Frontend Server
echo "3️⃣ Checking Frontend Server..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is running on port 3001"
else
    echo "❌ Frontend is NOT responding (HTTP $FRONTEND_STATUS)"
    exit 1
fi
echo ""

# Test 4: Frontend API Proxy
echo "4️⃣ Testing Frontend API Proxy..."
PROXY_RESPONSE=$(curl -s -X POST http://localhost:3001/api/company-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"priya@deliverit.com","password":"Company123"}')

if echo "$PROXY_RESPONSE" | grep -q "DeliverIt"; then
    echo "✅ Frontend proxy to backend works"
else
    echo "❌ Frontend proxy failed"
    echo "   Response: $PROXY_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Environment Check
echo "5️⃣ Checking Environment Files..."
if [ -f "company-portal/.env" ]; then
    echo "✅ company-portal/.env exists"
    VITE_URL=$(grep VITE_API_URL company-portal/.env | cut -d'=' -f2)
    echo "   API URL: $VITE_URL"
else
    echo "❌ company-portal/.env NOT FOUND"
    exit 1
fi
echo ""

echo "✅ All checks passed! You can now test the login in your browser:"
echo "   URL: http://localhost:3001"
echo "   Email: rajesh@foodies.com"
echo "   Password: Company123"
echo ""
echo "📝 Remember to open DevTools (F12) and check the Console for debug logs."
