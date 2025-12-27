# Company Portal Login Debug Guide

## Testing the Login Flow

### Step 1: Backend Verification
The backend API is working correctly:
```
curl -X POST http://localhost:5000/api/company-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh@foodies.com","password":"Company123"}'
```

Response:
```json
{
  "company": {
    "id": "416b83fd-9d4a-4eba-8797-3a47495f6179",
    "name": "Foodies Pvt Ltd",
    "email": "rajesh@foodies.com",
    "contact_person": "Rajesh Kumar",
    "phone_number": "9876543210",
    "status": "ACTIVE"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 2: Frontend Debugging
To debug the login in the browser:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to login with:
   - Email: `rajesh@foodies.com`
   - Password: `Company123`

4. Look for console logs starting with `[LOGIN]`:
   - `[LOGIN] Attempting login with email: ...`
   - `[LOGIN] Login successful, response: ...`
   - `[LOGIN] Auth context updated, navigating to dashboard`
   - `[LOGIN] Navigating to dashboard`

5. Also check for `[API]` logs showing the request/response

### Step 3: Network Tab
In the Network tab, look for the POST request to `/api/company-auth/login`:
- Should return 200 status
- Response should contain company data and token

### Step 4: Local Storage
After successful login, check Application > Local Storage:
- `company_auth_token` should contain the JWT token
- `company_data` should contain the company JSON

### Test Credentials
```
Email: rajesh@foodies.com OR priya@deliverit.com
Password: Company123
```

### Common Issues

1. **"Login failed" with no specific error**
   - Check Network tab for actual error response
   - Look at console for error details

2. **API request fails with CORS error**
   - Verify backend is running on port 5000
   - Check VITE_API_URL in company-portal/.env

3. **Login succeeds but redirects back to login**
   - Check if localStorage is being set
   - Verify token is valid (check JWT.io)

4. **Page is loading forever**
   - Check CompanyAuthProvider loading state
   - Verify backend /company-portal/{id}/profile endpoint works
