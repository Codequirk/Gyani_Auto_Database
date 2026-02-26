# 🧪 Quick Test Guide - Registration & Login Redirect

## What Was Fixed ✨

- ✅ Registration now redirects to dashboard (was stuck on success message)
- ✅ Login now redirects to dashboard (was stuck on success message)
- ✅ Dashboard loads company data with approval status (was empty)
- ✅ Shows "Pending Approval" page with company details

---

## 🚀 How to Test (5 minutes)

### Prerequisites
- Backend running: `npm run dev` in `backend` folder (port 5001)
- Company Portal running: `npm run dev` in `company-portal` folder (port 3001)
- MongoDB running

---

## Test 1: Registration Complete Flow ✅

### Step 1: Navigate to Register
```
URL: http://localhost:3001/company/register
```

### Step 2: Submit Email
```
Email: testuser+1@company.com
Click: "Send OTP"
Expected: "OTP sent to your email"
```

### Step 3: Enter OTP
```
Check email inbox for OTP code (6 digits)
Page: http://localhost:3001/company/verify-otp
Enter: 6-digit code from email
Click: "Verify OTP"
Expected: "Email verified successfully"
```

### Step 4: Complete Profile
```
Page: http://localhost:3001/company/complete-profile
Fill form:
  Password: TestPass123!
  Company Name: Test Company Ltd
  Phone: 9999999999
  Company Person: John Doe

Click: "Complete Registration"
Expected: "Profile completed successfully!" ← Success message

⏳ Wait 1 second...

🎯 SHOULD REDIRECT TO: /dashboard
```

### Step 5: Verify Dashboard Loads
```
✓ Navbar visible (should show company name)
✓ Page title: "Registration Pending Approval" visible
✓ Shows: "Your company registration is awaiting admin approval"
✓ Shows company details:
   - Company: Test Company Ltd
   - Email: testuser+1@company.com
   - Contact: John Doe
✓ "Refresh Page" button visible
```

**✅ Test Passed if:** Dashboard loads and shows approval message

---

## Test 2: Login Redirect Flow ✅

### Step 1: Logout (if still logged in)
```
Click navbar button or go to: http://localhost:3001/company/login
```

### Step 2: Enter Login Credentials
```
Page: http://localhost:3001/company/login
Email: testuser+1@company.com (from registration)
Password: TestPass123! (from registration)

Click: "Sign In"
Expected: "Login successful!" ← Success message

⏳ Wait 1 second...

🎯 SHOULD REDIRECT TO: /dashboard
```

### Step 3: Verify Dashboard Loads
```
✓ Same "Pending Approval" page appears
✓ Shows company details
✓ "Refresh Page" button works
```

**✅ Test Passed if:** Dashboard loads after login

---

## Test 3: Refresh Button Works ✅

### Step 1: Click Refresh
```
While on approval waiting page:
Click: "Refresh Page" button

Expected: Page updates with latest status
```

### Step 2: Verify
```
✓ Button shows "⏳ Checking..." while loading
✓ Page refreshes successfully
✓ Status remains "Pending Approval" (until admin approves)
```

**✅ Test Passed if:** Refresh works without errors

---

## Test 4: Protected Route Works ✅

### Step 1: Logout
```
In navbar, click logout button
OR: localStorage.removeItem('company_auth_token')
```

### Step 2: Try Accessing Dashboard
```
URL: http://localhost:3001/company/dashboard
Expected: Redirects to /login
```

### Step 3: Try Other Protected Routes
```
URL: http://localhost:3001/company/autos/123
Expected: Redirects to /login
```

**✅ Test Passed if:** Unauthorized users redirected to login

---

## Test 5: Multiple Users ✅

### Register Second User
```
Repeat Test 1 with different email:
  Email: testuser+2@company.com
  Password: TestPass456!
  Company: Another Company Inc
```

### Verify
```
✓ Each user has separate company data
✓ Each user's dashboard shows their company details
✓ Logout from first user, login as second user
✓ Correct company data appears for each user
```

**✅ Test Passed if:** Multiple users work independently

---

## Backend Logs to Verify ✅

### Watch Backend Console (port 5001)

During Registration:
```
[COMPANY-AUTH] Profile completion for user: [user-id]
[COMPANY-AUTH] Profile completed for: testuser+1@company.com
[COMPANY-AUTH] Creating Company record for: testuser+1@company.com
[COMPANY-AUTH] Company record created: [company-id]
```

During Login:
```
[COMPANY-AUTH] Login attempt: testuser+1@company.com
[COMPANY-AUTH] Login successful: testuser+1@company.com
```

**✅ Logs Confirm:** Backend correctly creates company and returns status

---

## Frontend Logs to Verify ✅

### Open Browser Console (F12 → Console tab)

During Registration:
```
[COMPLETE-PROFILE] Completing profile for user: [user-id]
[COMPLETE-PROFILE] Response: {...user data...}
```

During Login:
```
[COMPANY-LOGIN] Logging in user: testuser+1@company.com
[COMPANY-LOGIN] Response: {...user data...}
```

**✅ Logs Confirm:** Frontend receives data and calls context

---

## Common Issues & Solutions 🔧

### Issue: Still shows success message (doesn't redirect)
**Cause:** Navigation didn't trigger
**Solution:** 
- Check browser console for errors
- Check backend logs for API errors
- Try refreshing page manually

### Issue: Dashboard shows "Redirecting..." indefinitely
**Cause:** Context not loading
**Solution:**
- Check if company data in localStorage
- Open DevTools → Application → LocalStorage → company_data
- Should contain: `{"id":"...","company_status":"PENDING_APPROVAL",...}`

### Issue: Dashboard shows empty company details
**Cause:** Company object not in context
**Solution:**
- Check localStorage for `company_auth_token` and `company_data`
- Verify token contains company_id
- Check backend returned company_status in response

### Issue: "Protected route redirects to login"
**Cause:** Context token not recognized
**Solution:**
- Ensure `login()` was called in context
- Verify localStorage has both token and company_data
- Try logging in again

---

## Success Criteria ✅

All tests passed when:

- [x] Registration completes → redirects to dashboard
- [x] Login completes → redirects to dashboard
- [x] Dashboard loads without errors
- [x] Approval status page displays
- [x] Company details visible on approval page
- [x] Refresh button works
- [x] Logout works
- [x] Protected routes block unauthorized access
- [x] Multiple users work independently
- [x] Backend logs show Company record creation
- [x] Frontend logs show context updates

---

## Quick Restart Guide

If anything goes wrong:

### 1. Clear Everything
```powershell
# Backend
taskkill /F /IM node.exe
cd backend
npm run dev

# In another terminal, Company Portal
cd company-portal
npm run dev
```

### 2. Clear Browser Data
```
DevTools (F12) → Application → Clear Site Data
Then refresh page
```

### 3. Check Logs
```
Backend console: port 5001 output
Browser console: F12 → Console tab
Check for errors in red
```

---

## Time Estimate

| Test | Time |
|------|------|
| Test 1: Registration | 3 min |
| Test 2: Login | 1 min |
| Test 3: Refresh | 1 min |
| Test 4: Protected Routes | 1 min |
| Test 5: Multiple Users | 2 min |
| **Total** | **~8 min** |

---

## Summary

**What to expect:**
1. Register → See success → Auto-redirect to dashboard (1 sec)
2. See "Pending Approval" page with company details
3. Login → See success → Auto-redirect to dashboard (1 sec)
4. See same approval page with all company data
5. Refresh works to check updated status
6. Logout and protected routes work correctly

**If something doesn't work:**
1. Check backend logs (red errors)
2. Check browser console (F12)
3. Verify localStorage has company_data
4. Try restarting all servers

---

*Test Guide for Registration & Login Redirect Fix*
*February 19, 2026*
