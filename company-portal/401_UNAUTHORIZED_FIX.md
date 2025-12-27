# 401 Unauthorized Error - Debugging Guide

## What This Error Means
The backend is rejecting your login credentials. The status 401 means "Unauthorized".

## Possible Causes

### 1. **Wrong Email or Password** (Most Common)
Make sure you're using EXACTLY these credentials:

**Option A:**
```
Email: rajesh@foodies.com
Password: Company123
```

**Option B:**
```
Email: priya@deliverit.com
Password: Company123
```

⚠️ **Important**: 
- Passwords are CASE SENSITIVE
- Make sure there are no extra spaces before/after
- Email must be lowercase
- Password must be exactly "Company123"

### 2. **Check Browser Console for Detailed Error**
1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for logs starting with `[LOGIN]`
4. You should see one of these messages:
   - `[LOGIN] Login error details:` with status and error message
   - The actual error from backend will be shown

### 3. **What to Look For in Console**
When you see the error, expand the objects to see:
```
[LOGIN] Login error details: {
  "status": 401,
  "statusText": "Unauthorized",
  "error": "Invalid credentials",  ← This is the actual error
  "message": "...",
  "url": "/company-auth/login",
  "method": "post",
  "data": {...}  ← What you sent
}
```

### 4. **Check Network Tab**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Look for request to `/api/company-auth/login`
5. Click on it and check:
   - **Request Headers** - verify Content-Type is application/json
   - **Request Payload** - verify email and password are correct
   - **Response** - should show error message

### 5. **Verify Backend is Running**
Run this in PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing
```
Should return: `{"status":"ok"}`

### 6. **Test Credentials Directly**
Run this in PowerShell to verify credentials work:
```powershell
$body = '{"email":"rajesh@foodies.com","password":"Company123"}'
Invoke-WebRequest -Uri "http://localhost:5000/api/company-auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing
```

Should return status 200 with company data and token.

### 7. **Clear Browser Cache**
Sometimes old data causes issues:
1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Delete"
4. Refresh the login page

## Common Mistakes

| Mistake | Correct | Wrong |
|---------|---------|-------|
| Email spacing | `rajesh@foodies.com` | `rajesh@foodies.com ` (space at end) |
| Password case | `Company123` | `company123` or `COMPANY123` |
| Extra characters | `rajesh@foodies.com` | `rajesh@foodies.com;` |
| Using wrong password | `Company123` | `password123` or `Test1234` |

## Debug Checklist

- [ ] Email is exactly: `rajesh@foodies.com` or `priya@deliverit.com`
- [ ] Password is exactly: `Company123`
- [ ] No extra spaces in either field
- [ ] Backend is running (health check passes)
- [ ] Direct API test returns 200 OK
- [ ] Browser console shows detailed error message
- [ ] Network tab shows actual request/response

## Still Having Issues?

Share the console output showing:
```
[LOGIN] Login error details: {
  "status": ...,
  "statusText": "...",
  "error": "...",
  ...
}
```

This will help identify the exact problem.
