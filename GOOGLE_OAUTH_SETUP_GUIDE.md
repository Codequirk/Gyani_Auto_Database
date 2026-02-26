# Google OAuth - Setup & Deployment Guide

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Google Cloud Console Setup](#google-cloud-setup)
3. [Backend Configuration](#backend-config)
4. [Database Migration](#database-migration)
5. [Testing](#testing)
6. [Production Deployment](#production)
7. [Security Checklist](#security)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start (5 minutes)

### Prerequisites

- Node.js 14+
- MongoDB or PostgreSQL running
- Google account (for OAuth testing)
- Git

### Steps

1. **Install packages:**
   ```bash
   cd backend
   npm install passport passport-google-oauth20 dotenv
   ```

2. **Get Google OAuth credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project → Enable Google+ API → Create OAuth credentials
   - Copy Client ID and Secret

3. **Update .env:**
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   JWT_SECRET=super_secret_key_change_in_production
   ```

4. **Copy auth files to your project:**
   - `backend/src/config/passport.js`
   - `backend/src/services/authService.js`
   - `backend/src/middleware/authMiddleware.js`
   - Update `backend/src/routes/authRoutes.js`

5. **Run database migration:**
   ```bash
   mysql < GOOGLE_OAUTH_DATABASE_MIGRATION.sql
   ```

6. **Start backend:**
   ```bash
   npm run dev
   ```

7. **Test endpoint:**
   ```bash
   curl http://localhost:5000/api/auth/google
   # Should redirect to Google login
   ```

---

## Google Cloud Console Setup

### Step 1: Create Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Enter project name: "Gyani Auto Database"
4. Click "Create" (takes 1-2 minutes)

### Step 2: Enable Google+ API

1. In sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on result → Click "Enable"
4. Wait for enablement to complete

### Step 3: Create OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in form:
   - **App name:** "Gyani Auto Database"
   - **User support email:** your-email@example.com
   - **Developer contact:** your-email@example.com
4. Click "Save and Continue"
5. Scopes: Click "Add or Remove Scopes"
   - Select `.../auth/userinfo.email` and `.../auth/userinfo.profile`
   - Click "Update"
6. Click "Save and Continue" → "Save and Continue" again

### Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select application type: **"Web application"**
4. Fill in:
   - **Name:** "Gyani Auto - Web"
   - **Authorized JavaScript origins:**
     ```
     http://localhost:5000
     http://localhost:3000
     https://yourdomain.com (for production)
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:5000/api/auth/google/callback
     http://localhost:3000/api/auth/google/callback
     https://yourdomain.com/api/auth/google/callback
     ```
5. Click "Create"
6. Copy **Client ID** and **Client Secret**

### Step 5: Verify Test Users (if using External)

1. Go to "OAuth consent screen"
2. Click "Add Users" under test users
3. Add your email address
4. Test login with your account

---

## Backend Configuration

### File: backend/.env

Create or update `.env` in backend root:

```env
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT
JWT_SECRET=generate_a_long_random_string_here_minimum_32_chars
JWT_EXPIRY=24h

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=admin_panel_db

# Server
PORT=5000
NODE_ENV=development
```

### File: backend/.env.example (for git)

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT
JWT_SECRET=
JWT_EXPIRY=24h

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=

# Server
PORT=5000
NODE_ENV=development
```

### File: backend/src/index.js

Add Passport initialization:

```javascript
const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('dotenv').config();
require('./config/passport'); // Load Passport strategies

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ],
  credentials: true,
}));

// Initialize Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
// ... other routes

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
```

---

## Database Migration

### Step 1: Backup Database

```bash
# MySQL
mysqldump -u root -p admin_panel_db > backup_$(date +%Y%m%d).sql

# PostgreSQL
pg_dump -U username admin_panel_db > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migration

```bash
# MySQL
mysql -u root -p admin_panel_db < GOOGLE_OAUTH_DATABASE_MIGRATION.sql

# PostgreSQL (modify as needed)
psql -U username admin_panel_db < GOOGLE_OAUTH_DATABASE_MIGRATION.sql
```

### Step 3: Verify Schema

```sql
DESCRIBE companies;
```

Expected columns:
- `google_id` - NULL initially
- `auth_provider` - 'local' by default
- `is_profile_complete` - 1 (true) for existing users
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### Step 4: Update Existing Users

```sql
-- Ensure all existing users are marked as local auth
UPDATE companies 
SET auth_provider = 'local' 
WHERE auth_provider IS NULL;

-- Mark existing profiles as complete
UPDATE companies 
SET is_profile_complete = 1 
WHERE company_name IS NOT NULL AND phone_number IS NOT NULL;
```

---

## Testing

### Test 1: Local Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "contact_person": "John Doe",
    "company_name": "Test Company",
    "phone_number": "+1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "contact_person": "John Doe",
    "company_name": "Test Company",
    "auth_provider": "local",
    "is_profile_complete": false
  }
}
```

### Test 2: Local Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Test 3: Get Profile (Protected)

```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 4: Google OAuth (Browser)

1. Open browser: `http://localhost:5000/api/auth/google`
2. Should redirect to Google login
3. Select account and approve permissions
4. Should redirect back to `http://localhost:3000?token=...&success=true`

### Test 5: Complete Profile

```bash
curl -X POST http://localhost:5000/api/auth/complete-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "company_name": "My Company",
    "phone_number": "+1234567890"
  }'
```

---

## Production Deployment

### Step 1: Environment Variables

Update in your deployment platform (Heroku, AWS, Azure, etc.):

```env
GOOGLE_CLIENT_ID=production_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=production_client_secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback
JWT_SECRET=generate_with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRY=24h
NODE_ENV=production
DB_HOST=your_production_db_host
DB_USER=production_user
DB_PASSWORD=production_password
```

### Step 2: Google Cloud Console - Add Production URLs

1. Go to Google Cloud Console
2. Navigate to OAuth client → Edit
3. Add to **Authorized redirect URIs:**
   ```
   https://api.yourdomain.com/api/auth/google/callback
   https://yourdomain.com/auth/google/callback
   ```

### Step 3: Frontend Environment

Update `frontend/.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
```

### Step 4: HTTPS Required

In production, always use HTTPS:

```javascript
// backend/src/index.js
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### Step 5: Database Backup

```bash
# PostgreSQL
pg_dump -h production_host -U username dbname > backup_$(date +%Y%m%d).sql

# MySQL
mysqldump -h production_host -u username -p dbname > backup_$(date +%Y%m%d).sql
```

### Step 6: Run Migration on Production

```bash
# SSH into production server
ssh user@yourdomain.com

# Backup first
mysqldump -u root -p dbname > backup_before_oauth.sql

# Run migration
mysql -u root -p dbname < GOOGLE_OAUTH_DATABASE_MIGRATION.sql

# Verify
mysql -u root -p dbname -e "DESCRIBE companies;"
```

---

## Security Checklist

### Client Secrets

- [ ] `GOOGLE_CLIENT_SECRET` never in frontend code
- [ ] `.env` with secrets in `.gitignore`
- [ ] `.env.example` without secrets committed to git
- [ ] Secrets stored in deployment platform securely

### JWT Security

- [ ] `JWT_SECRET` is 32+ characters randomly generated
- [ ] `JWT_EXPIRY` set to reasonable value (24h)
- [ ] Token only sent with HTTPS in production
- [ ] Token stored in localStorage (not cookie for SPA)
- [ ] No sensitive data in JWT payload

### Database

- [ ] `google_id` has UNIQUE constraint
- [ ] `email` has UNIQUE constraint
- [ ] Indexes on `google_id`, `email`, `auth_provider`
- [ ] `password_hash` stored hashed (bcrypt 10+ rounds)
- [ ] Soft delete considered for compliance

### API Security

- [ ] CORS configured to allow frontend domain only
- [ ] Rate limiting on `/login` and `/register` endpoints
- [ ] Input validation on all endpoints
- [ ] Password requirements enforced (min 8 chars)
- [ ] Account lockout after N failed login attempts

### Production

- [ ] HTTPS enforced
- [ ] Database backups automated
- [ ] Error messages don't expose sensitive info
- [ ] Logging configured (no passwords in logs)
- [ ] Monitoring/alerts set up

---

## Troubleshooting

### Issue: "Redirect URI mismatch"

**Cause:** Exact URL mismatch between code and Google Console

**Solution:**
1. Check `GOOGLE_CALLBACK_URL` in `.env`
2. Verify in Google Cloud Console → OAuth client → Authorized redirect URIs
3. Must be exact match (case-sensitive, no trailing slash)

```env
# Correct
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Wrong
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback/
GOOGLE_CALLBACK_URL=http://localhost:5000/API/AUTH/GOOGLE/CALLBACK
```

### Issue: "Invalid Client ID"

**Cause:** Credentials mismatch or API not enabled

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` in `.env` matches Google Cloud
2. Check Google+ API is enabled
3. Wait 1-2 minutes after enabling (takes time to propagate)

### Issue: "Token verification failed"

**Cause:** JWT_SECRET mismatch or corrupted token

**Solution:**
1. Check `JWT_SECRET` in backend `.env`
2. Restart backend after changing JWT_SECRET
3. Clear old tokens from localStorage

### Issue: "User already exists" but email is different

**Cause:** Google account used multiple times

**Solution:**
1. Check `google_id` UNIQUE constraint
2. Delete test data: `DELETE FROM companies WHERE google_id IS NOT NULL;`
3. Test again

### Issue: CORS error on Google login

**Cause:** CORS not configured properly

**Solution:**
```javascript
// backend/src/index.js
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Issue: "Token not being sent with requests"

**Cause:** Axios interceptor not working

**Solution:**
```javascript
// frontend/src/services/api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  console.log('Token to send:', token); // Debug
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Issue: Profile not updating

**Cause:** Token doesn't include user ID or DB update fails

**Solution:**
1. Decode JWT: `console.log(jwt_decode(token))`
2. Verify `id` is in payload
3. Check MySQL for UPDATE errors: `SELECT * FROM companies WHERE id = 'uuid';`

---

## Quick Reference

### Useful Commands

```bash
# Generate random JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Decode JWT token (node)
node -e "console.log(JSON.stringify(require('jsonwebtoken').decode('your_token'), null, 2))"

# View database schema
DESCRIBE companies;

# Count users by auth provider
SELECT auth_provider, COUNT(*) FROM companies GROUP BY auth_provider;

# Find incomplete profiles
SELECT * FROM companies WHERE is_profile_complete = false;

# Delete test user
DELETE FROM companies WHERE email = 'test@example.com';
```

### Environment Variables Summary

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | OAuth callback | `http://localhost:5000/api/auth/google/callback` |
| `JWT_SECRET` | JWT signing key | Random 32+ chars |
| `JWT_EXPIRY` | Token expiry | `24h` |
| `NODE_ENV` | Environment | `development` / `production` |

---

## Next Steps

1. ✅ Google Cloud Console setup
2. ✅ Copy auth files to backend
3. ✅ Update .env with credentials
4. ✅ Run database migration
5. ✅ Test endpoints with curl
6. ✅ Test Google OAuth in browser
7. ✅ Build frontend components
8. ✅ Test complete flow end-to-end
9. ✅ Deploy to production
10. ✅ Monitor for errors

Good luck! 🚀
