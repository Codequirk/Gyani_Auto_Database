# Google OAuth Implementation Checklist

## Pre-Implementation

- [ ] Read `GOOGLE_OAUTH_QUICK_START.md`
- [ ] Read `GOOGLE_OAUTH_SETUP_GUIDE.md` 
- [ ] Understand the architecture (see diagrams)
- [ ] Check all files are in the root directory

---

## Google Cloud Console Setup

### Project Creation
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project named "Gyani Auto Database"
- [ ] Wait for project creation (1-2 minutes)

### API Enablement
- [ ] Go to APIs & Services → Library
- [ ] Search for "Google+ API"
- [ ] Click on Google+ API
- [ ] Click "Enable"
- [ ] Wait for enablement (1-2 minutes)

### OAuth Consent Screen
- [ ] Go to APIs & Services → OAuth consent screen
- [ ] Choose "External" user type
- [ ] Fill in app name: "Gyani Auto Database"
- [ ] Enter user support email
- [ ] Enter developer contact email
- [ ] Add scopes: userinfo.email and userinfo.profile
- [ ] Click Save and Continue

### OAuth Credentials
- [ ] Go to APIs & Services → Credentials
- [ ] Click "Create Credentials" → "OAuth client ID"
- [ ] Select "Web application"
- [ ] Enter name: "Gyani Auto - Web"
- [ ] Add JavaScript origins:
  - [ ] `http://localhost:5000`
  - [ ] `http://localhost:3000`
  - [ ] `https://yourdomain.com` (production)
- [ ] Add Authorized redirect URIs:
  - [ ] `http://localhost:5000/api/auth/google/callback`
  - [ ] `http://localhost:3000/auth/google/callback`
  - [ ] `https://yourdomain.com/api/auth/google/callback` (production)
- [ ] Click "Create"
- [ ] Copy Client ID
- [ ] Copy Client Secret

---

## Backend Setup

### Prerequisites
- [ ] Node.js 14+ installed
- [ ] npm available in terminal
- [ ] Backend directory accessible

### Install Dependencies
- [ ] Open terminal in backend root
- [ ] Run: `npm install passport passport-google-oauth20 dotenv`
- [ ] Verify installation: `npm list passport passport-google-oauth20`

### Create Environment File
- [ ] Create file: `backend/.env`
- [ ] Add variables:
  ```
  GOOGLE_CLIENT_ID=your_client_id
  GOOGLE_CLIENT_SECRET=your_client_secret
  GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
  JWT_SECRET=generate_random_string_32_chars_min
  JWT_EXPIRY=24h
  NODE_ENV=development
  ```
- [ ] Verify file is in `.gitignore`
- [ ] Create `.env.example` (without secrets)

### Copy Backend Files
- [ ] Copy `backend/src/config/passport.js` to your project
- [ ] Copy `backend/src/services/authService.js` to your project
- [ ] Copy `backend/src/middleware/authMiddleware.js` to your project
- [ ] Copy or reference `backend/src/controllers/companyUserAuthController.js`

### Update Backend App
- [ ] Open `backend/src/index.js`
- [ ] Add: `const passport = require('passport');`
- [ ] Add: `require('./config/passport');` (after requires)
- [ ] Add: `app.use(passport.initialize());` (after middleware setup)
- [ ] Add: `app.use('/api/auth', require('./routes/authRoutes'));`
- [ ] Verify no errors: `npm run dev`

### Verify Backend
- [ ] Terminal shows "✓ Server running on http://localhost:5000"
- [ ] No errors in console
- [ ] Can access http://localhost:5000/api/auth/google in browser

---

## Database Setup

### Backup
- [ ] Backup current database
  ```bash
  # MySQL
  mysqldump -u root -p admin_panel_db > backup_$(date +%Y%m%d).sql
  
  # PostgreSQL
  pg_dump -U username admin_panel_db > backup_$(date +%Y%m%d).sql
  ```
- [ ] Verify backup file exists
- [ ] Test restore if possible

### Migration
- [ ] Open `GOOGLE_OAUTH_DATABASE_MIGRATION.sql`
- [ ] Copy ALTER TABLE statements
- [ ] Run in MySQL client or terminal:
  ```bash
  mysql -u root -p admin_panel_db < GOOGLE_OAUTH_DATABASE_MIGRATION.sql
  ```
- [ ] Or paste statements into MySQL GUI

### Verification
- [ ] Check schema was updated:
  ```sql
  DESCRIBE companies;
  ```
- [ ] Verify these columns exist:
  - [ ] `google_id`
  - [ ] `auth_provider`
  - [ ] `is_profile_complete`
  - [ ] `created_at`
  - [ ] `updated_at`
- [ ] Verify indexes created:
  ```sql
  SHOW INDEX FROM companies;
  ```
- [ ] Check for:
  - [ ] `idx_companies_google_id`
  - [ ] `idx_companies_auth_provider`
  - [ ] `idx_companies_profile_complete`

---

## Backend Testing

### Test 1: Local Registration
- [ ] Run curl command:
  ```bash
  curl -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "TestPass123!",
      "contact_person": "John Doe",
      "company_name": "Test Co",
      "phone_number": "+1234567890"
    }'
  ```
- [ ] Response includes: `"success": true`
- [ ] Response includes: user object with `auth_provider: "local"`
- [ ] User created in database

### Test 2: Local Login
- [ ] Run curl command:
  ```bash
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "TestPass123!"
    }'
  ```
- [ ] Response includes: `"success": true`
- [ ] Response includes: `"token": "eyJ..."`
- [ ] Response includes: user object

### Test 3: Google OAuth
- [ ] Copy JWT token from login response
- [ ] Open browser: `http://localhost:5000/api/auth/google`
- [ ] Redirected to Google login page
- [ ] Can select Google account
- [ ] Google asks for permissions
- [ ] After approval, redirected back to app

### Test 4: Get Profile
- [ ] Get JWT token from login
- [ ] Run curl:
  ```bash
  curl http://localhost:5000/api/auth/profile \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
  ```
- [ ] Response includes current user profile
- [ ] No error 401 Unauthorized

### Test 5: Complete Profile
- [ ] Register new user (or get incomplete user token)
- [ ] Run curl:
  ```bash
  curl -X POST http://localhost:5000/api/auth/complete-profile \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d '{
      "company_name": "My Company",
      "phone_number": "+1234567890"
    }'
  ```
- [ ] Response includes: `"success": true`
- [ ] User has `is_profile_complete: true`
- [ ] New token provided

---

## Frontend Setup

### Install Dependencies
- [ ] Open terminal in frontend root
- [ ] Run: `npm install @react-oauth/google axios`
- [ ] Verify installation: `npm list @react-oauth/google`

### Create Environment File
- [ ] Create/update `frontend/.env`:
  ```
  VITE_API_URL=http://localhost:5000
  VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
  ```

### Create Auth Service
- [ ] Create file: `frontend/src/services/authService.js`
- [ ] Copy code from `GOOGLE_OAUTH_FRONTEND_GUIDE.md` Part 4
- [ ] Update API endpoints if different

### Update API Service
- [ ] Open/create: `frontend/src/services/api.js`
- [ ] Add axios interceptor for token
- [ ] Handle 401 errors (redirect to login)

### Create Login Page
- [ ] Create file: `frontend/src/pages/LoginPage.jsx`
- [ ] Copy code from `GOOGLE_OAUTH_FRONTEND_GUIDE.md` Part 5
- [ ] Test local auth form
- [ ] Test Google button

### Create Complete Profile Page
- [ ] Create file: `frontend/src/pages/CompleteProfilePage.jsx`
- [ ] Copy code from `GOOGLE_OAUTH_FRONTEND_GUIDE.md` Part 6
- [ ] Update styling if needed

### Create Protected Route
- [ ] Create file: `frontend/src/components/ProtectedRoute.jsx`
- [ ] Copy code from `GOOGLE_OAUTH_FRONTEND_GUIDE.md` Part 7

### Update App Routing
- [ ] Open `frontend/src/App.jsx`
- [ ] Add routes:
  - [ ] `/login` → LoginPage
  - [ ] `/complete-profile` → CompleteProfilePage
  - [ ] `/dashboard` → ProtectedRoute(Dashboard)
- [ ] Add OAuth callback handler
- [ ] Test routing

---

## Frontend Testing

### Test 1: Navigate to Login
- [ ] Open http://localhost:3000/login
- [ ] Page loads without errors
- [ ] Both login forms visible (email/password and Google)

### Test 2: Local Registration Form
- [ ] Fill in all fields
- [ ] Click "Sign Up"
- [ ] Should see success message
- [ ] User created in database
- [ ] Can verify with: `SELECT * FROM companies WHERE email = 'test@example.com';`

### Test 3: Local Login Form
- [ ] Fill in email and password
- [ ] Click "Sign In"
- [ ] Redirected to dashboard
- [ ] Token stored in localStorage
- [ ] Check in DevTools: `localStorage.getItem('auth_token')`

### Test 4: Google Login Button
- [ ] Click "Continue with Google"
- [ ] Redirected to Google login
- [ ] Can authenticate
- [ ] Redirected back to app
- [ ] Token stored in localStorage
- [ ] Redirected to complete profile (if new user)

### Test 5: Complete Profile Flow
- [ ] Register/login with Google
- [ ] Redirected to `/complete-profile`
- [ ] Form displays
- [ ] Fill in fields and submit
- [ ] Redirected to dashboard
- [ ] Can access protected routes

### Test 6: Protected Routes
- [ ] Logout (clear localStorage)
- [ ] Try to access `/dashboard` directly
- [ ] Should redirect to `/login`
- [ ] With valid token, can access

### Test 7: Token in Headers
- [ ] Login successfully
- [ ] Open DevTools Network tab
- [ ] Make API request
- [ ] Check request headers
- [ ] Should show: `Authorization: Bearer YOUR_TOKEN`

---

## Integration Testing

### Complete Flow: Email/Password
1. [ ] Visit http://localhost:3000/login
2. [ ] Register with email/password
3. [ ] Verify user created in DB
4. [ ] Login with same email/password
5. [ ] Verify token received
6. [ ] Verify redirected to dashboard
7. [ ] Verify can access protected endpoints
8. [ ] Logout
9. [ ] Verify token cleared
10. [ ] Verify cannot access dashboard

### Complete Flow: Google OAuth
1. [ ] Visit http://localhost:3000/login
2. [ ] Click "Continue with Google"
3. [ ] Authenticate with Google
4. [ ] Verify user created in DB with `google_id`
5. [ ] Verify redirected to complete profile
6. [ ] Fill in company info
7. [ ] Verify `is_profile_complete = true`
8. [ ] Verify redirected to dashboard
9. [ ] Verify can access protected endpoints
10. [ ] Logout
11. [ ] Verify token cleared

### Error Handling
- [ ] Try login with wrong password → Error message
- [ ] Try register with existing email → Error message
- [ ] Try access protected route without token → Redirect to login
- [ ] Try invalid token → Error message
- [ ] Try incomplete profile login → Redirect to complete profile

---

## Security Verification

### Passwords
- [ ] Minimum 8 characters required
- [ ] Uppercase letter required
- [ ] Lowercase letter required
- [ ] Number required
- [ ] Password not stored in plain text (check DB)

### JWT
- [ ] JWT_SECRET is 32+ characters
- [ ] Token includes user ID
- [ ] Token includes auth_provider
- [ ] Token expires at specified time
- [ ] Can't modify token (signature check)

### Database
- [ ] Email column has UNIQUE constraint
- [ ] google_id column has UNIQUE constraint
- [ ] Passwords are hashed with bcrypt
- [ ] No sensitive data in logs

### API
- [ ] CORS configured for frontend domain
- [ ] Protected routes check token
- [ ] Invalid tokens rejected
- [ ] Error messages don't expose data

---

## Production Readiness

### Environment
- [ ] JWT_SECRET is secure 32+ char random string
- [ ] NODE_ENV set to production
- [ ] FRONTEND_URL configured
- [ ] Database backups automated

### Deployment
- [ ] Update GOOGLE_CALLBACK_URL to production domain
- [ ] Add production OAuth credentials in Google Cloud
- [ ] Configure HTTPS enforcement
- [ ] Setup error logging
- [ ] Enable monitoring/alerts
- [ ] Prepare rollback plan

### Database
- [ ] Latest backup created
- [ ] Migration tested in staging
- [ ] Indexes created
- [ ] Performance verified

### Security
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] CORS restrictive
- [ ] Input validation enabled
- [ ] Error messages sanitized

---

## Final Verification Checklist

### Code
- [ ] All backend files copied correctly
- [ ] All imports resolved (no errors)
- [ ] All routes mounted
- [ ] All middleware added
- [ ] Frontend components created
- [ ] Routing configured

### Database
- [ ] Migration executed
- [ ] Schema verified
- [ ] Indexes created
- [ ] Test data working

### Testing
- [ ] All curl tests passed
- [ ] All browser tests passed
- [ ] Integration tests passed
- [ ] Error handling verified
- [ ] Security checks passed

### Configuration
- [ ] .env file created
- [ ] All variables set
- [ ] Google credentials verified
- [ ] JWT_SECRET secure
- [ ] CORS configured

### Documentation
- [ ] Understood architecture
- [ ] Followed implementation guide
- [ ] Reviewed API documentation
- [ ] Reviewed security best practices
- [ ] Prepared deployment steps

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Database backed up
- [ ] Environment variables configured
- [ ] SSL certificate ready
- [ ] Monitoring setup

### Deployment
- [ ] Run database migration
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Update DNS if needed
- [ ] Test in production

### Post-Deployment
- [ ] Verify all endpoints working
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Verify OAuth flow
- [ ] Test user registration/login
- [ ] Check monitoring alerts

---

## Rollback Plan

If issues occur:

- [ ] Database: Restore from backup
  ```bash
  mysql -u root -p admin_panel_db < backup_20260213.sql
  ```
- [ ] Backend: Revert code to previous version
- [ ] Frontend: Revert code to previous version
- [ ] Verify OAuth credentials still valid
- [ ] Test complete flow

---

## Success Criteria

After implementation, verify:

- [ ] ✅ Users can register locally
- [ ] ✅ Users can login with email/password
- [ ] ✅ Users can login with Google
- [ ] ✅ New users complete profile
- [ ] ✅ JWT tokens generated and verified
- [ ] ✅ Protected routes work
- [ ] ✅ Token refresh works
- [ ] ✅ Logout clears token
- [ ] ✅ Database schema correct
- [ ] ✅ No errors in logs
- [ ] ✅ All security checks passed
- [ ] ✅ Performance acceptable
- [ ] ✅ Ready for production

---

## Sign-Off

- [ ] **Backend Developer**: Confirms backend implementation ✓
- [ ] **Frontend Developer**: Confirms frontend implementation ✓
- [ ] **QA Tester**: Confirms all tests passing ✓
- [ ] **DevOps/Deploy**: Confirms deployment ready ✓
- [ ] **Project Manager**: Approves release ✓

---

**Implementation Status**: Ready for deployment ✅

Good luck! 🚀
