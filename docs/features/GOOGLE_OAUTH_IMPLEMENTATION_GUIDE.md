# Google OAuth Implementation Guide

## Overview

This guide provides step-by-step instructions to add Google OAuth authentication to your Node.js/Express backend while maintaining existing email/password authentication.

**Architecture:**
- **Local Auth**: Email + Password → Hashed password + JWT
- **Google OAuth**: Google account → JWT
- **Profile Completion**: New Google users must complete profile (company name, phone)
- **JWT Based**: No sessions, stateless authentication

---

## Part 1: Database Setup

### 1.1 Run Migration

Execute the SQL migration to update your users/companies table:

```sql
-- Add columns for Google OAuth support
ALTER TABLE companies ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE companies ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE companies ADD COLUMN is_profile_complete BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE companies ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create indexes for faster lookups
CREATE INDEX idx_companies_google_id ON companies(google_id);
CREATE INDEX idx_companies_email ON companies(email);
CREATE INDEX idx_companies_auth_provider ON companies(auth_provider);
CREATE INDEX idx_companies_profile_complete ON companies(is_profile_complete);
```

### 1.2 Verify Schema

```sql
DESCRIBE companies;
```

You should see the new columns:
- `google_id`
- `auth_provider` (default 'local')
- `is_profile_complete` (default 1)
- `created_at`
- `updated_at`

---

## Part 2: Install Dependencies

### 2.1 Add NPM Packages

```bash
cd backend
npm install passport passport-google-oauth20 dotenv
npm install --save-dev @types/passport-google-oauth20
```

**Packages:**
- `passport`: Authentication middleware
- `passport-google-oauth20`: Google OAuth 2.0 strategy
- `dotenv`: Environment variable management (if not already installed)

**Already installed (verify):**
- `jsonwebtoken`: JWT generation/verification
- `bcryptjs` or `bcrypt`: Password hashing
- `express`: Web framework

### 2.2 Verify Installation

```bash
npm list passport passport-google-oauth20
```

---

## Part 3: Environment Configuration

### 3.1 Update .env File

Add these variables to your `.env` file:

```env
# Google OAuth Credentials (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT Configuration
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRY=24h

# Environment
NODE_ENV=development
```

### 3.2 Create .env.example

Add to git (no secrets):

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=24h
NODE_ENV=development
```

---

## Part 4: Create Auth Service

### 4.1 Create File: `backend/src/services/authService.js`

This file contains business logic for authentication:
- JWT token generation
- Password hashing/verification
- User creation
- Profile completion
- Validation functions

**Copy the file from GOOGLE_OAUTH_AUTH_SERVICE.js** (see files created)

---

## Part 5: Create Auth Middleware

### 5.1 Create File: `backend/src/middleware/authMiddleware.js`

This file contains middleware for verifying JWT tokens:
- `verifyToken`: Basic JWT verification
- `verifyTokenAndProfile`: JWT + profile complete check
- `optionalAuth`: Optional token verification

**Copy the file from GOOGLE_OAUTH_AUTH_MIDDLEWARE.js**

**Key function:**
```javascript
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, controller.getProfile);
```

---

## Part 6: Create Passport Configuration

### 6.1 Create File: `backend/src/config/passport.js`

This file configures Passport strategies:
- **Local Strategy**: Email + password authentication
- **Google Strategy**: OAuth 2.0 via Google
- **Serialization**: For session handling (not used with JWT)

**Copy from GOOGLE_OAUTH_PASSPORT_CONFIG.js**

### 6.2 Initialize Passport in Main App

In `backend/src/index.js`, add:

```javascript
const passport = require('passport');
require('./config/passport'); // Load strategies

// In middleware section (after express setup)
app.use(express.json());
app.use(passport.initialize());
// Don't use passport.session() for JWT auth

// Then mount routes
```

---

## Part 7: Update Company Model

### 7.1 Update `backend/src/models/Company.js`

Add these static methods to the Company class:

```javascript
/**
 * Find company by Google ID
 */
static async findByGoogleId(googleId) {
  // Implement based on your ORM
  const company = await db('companies')
    .where({ google_id: googleId, deleted_at: null })
    .first();
  return company ? company : null;
}

/**
 * Find company by email
 */
static async findByEmail(email) {
  const company = await db('companies')
    .where({ email: email.toLowerCase(), deleted_at: null })
    .first();
  return company ? company : null;
}

/**
 * Create new company (with Google OAuth support)
 */
static async create(data) {
  const company = {
    id: uuidv4(),
    email: data.email?.toLowerCase() || null,
    password_hash: data.password_hash || null,
    google_id: data.google_id || null,
    contact_person: data.contact_person || 'User',
    company_name: data.company_name || null,
    phone_number: data.phone_number || null,
    auth_provider: data.auth_provider || 'local',
    is_profile_complete: data.is_profile_complete !== undefined ? data.is_profile_complete : false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db('companies').insert(company);
  return this.findById(company.id);
}

/**
 * Update company
 */
static async update(id, data) {
  await db('companies')
    .where({ id })
    .update({
      ...data,
      updated_at: new Date(),
    });
  return this.findById(id);
}
```

---

## Part 8: Create Auth Controller (User-Facing)

### 8.1 Create File: `backend/src/controllers/companyUserAuthController.js`

This handles company user authentication (separate from admin auth).

**Methods:**
- `register`: Email/password registration
- `login`: Email/password login
- `googleCallback`: Google OAuth callback
- `completeProfile`: Complete profile for new users
- `getProfile`: Get current user
- `refreshToken`: Refresh JWT
- `logout`: Logout (client-side cleanup)

**Difference from existing:**
- Existing `companyAuthController.js` is for company registration/approval
- New `companyUserAuthController.js` is for company user authentication
- You may need to refactor or create as separate endpoints

---

## Part 9: Create Auth Routes

### 9.1 Update/Create File: `backend/src/routes/authRoutes.js`

Add these endpoints:

```javascript
const express = require('express');
const passport = require('passport');
const { verifyToken } = require('../middleware/authMiddleware');
const authController = require('../controllers/companyUserAuthController');

const router = express.Router();

// Local authentication
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login?error=authentication_failed' 
  }),
  authController.googleCallback
);

// Protected routes (require valid JWT)
router.post('/complete-profile', verifyToken, authController.completeProfile);
router.get('/profile', verifyToken, authController.getProfile);
router.post('/refresh', verifyToken, authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
```

### 9.2 Mount in Main App

In `backend/src/index.js`:

```javascript
app.use('/api/auth', require('./routes/authRoutes'));
```

---

## Part 10: Setup Google Cloud Console

### 10.1 Create Google OAuth Credentials

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**

2. **Create a new project:**
   - Click "Select a Project" → "New Project"
   - Name: "Gyani Auto Database" (or your project name)
   - Click "Create"

3. **Enable Google+ API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click → "Enable"

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Under "Authorized redirect URIs", add:
     ```
     http://localhost:5000/api/auth/google/callback
     http://localhost:3000/auth/google/callback (for frontend)
     https://yourdomain.com/api/auth/google/callback (production)
     ```
   - Click "Create"

5. **Copy credentials:**
   - Copy `Client ID` → `GOOGLE_CLIENT_ID` in .env
   - Copy `Client Secret` → `GOOGLE_CLIENT_SECRET` in .env

### 10.2 Testing Credentials (Local Development)

For testing, you can use:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

## Part 11: Frontend Integration

### 11.1 Frontend Environment Variables

In `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### 11.2 Google Button Component

Create `frontend/src/components/GoogleLoginButton.jsx`:

```javascript
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export function GoogleLoginButton() {
  const handleGoogleLogin = (credentialResponse) => {
    console.log('Token:', credentialResponse.credential);
    
    // Option 1: Send code to backend
    // Option 2: Use ID token directly
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        onError={() => console.error('Login failed')}
        text="continue_with"
        locale="en_US"
      />
    </GoogleOAuthProvider>
  );
}
```

### 11.3 OAuth Redirect Method (Simpler)

```javascript
// Simple Google OAuth button (redirect-based)
function GoogleOAuthButton() {
  const handleGoogleAuth = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <button 
      onClick={handleGoogleAuth}
      className="btn-google"
    >
      <img src="/google-icon.svg" alt="Google" />
      Continue with Google
    </button>
  );
}
```

### 11.4 Complete Profile Page

Create `frontend/src/pages/CompleteProfilePage.jsx`:

```javascript
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

export function CompleteProfilePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({
    company_name: '',
    phone_number: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/complete-profile',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save token
      localStorage.setItem('auth_token', response.data.token);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error:', error.response?.data?.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Company Name"
        value={formData.company_name}
        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
        required
      />
      <input
        type="tel"
        placeholder="Phone Number"
        value={formData.phone_number}
        onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
        required
      />
      <button type="submit">Complete Profile</button>
    </form>
  );
}
```

### 11.5 Handle OAuth Callback

In `frontend/src/App.jsx` or login page:

```javascript
// After Google redirects back with token in URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const success = urlParams.get('success');

if (token && success === 'true') {
  localStorage.setItem('auth_token', token);
  window.location.href = '/dashboard';
}
```

---

## Part 12: Complete Workflow

### 12.1 New User via Google OAuth

```
1. User clicks "Continue with Google"
   ↓
2. Redirected to /api/auth/google (Passport initiates OAuth)
   ↓
3. User logs in with Google account
   ↓
4. Google redirects to /api/auth/google/callback
   ↓
5. Passport verifies token, creates/updates user
   ↓
6. If profile incomplete:
   → Redirect to /complete-profile?token=JWT
   → User enters company name + phone
   → POST /api/auth/complete-profile
   → Redirect to dashboard with token
   ↓
7. If profile complete:
   → Redirect to /?token=JWT
   → Frontend stores token
   → Access dashboard
```

### 12.2 Existing User Login

```
1. User enters email + password
   ↓
2. POST /api/auth/login
   ↓
3. Server checks:
   - Email exists? No → 401 Invalid credentials
   - auth_provider = 'local'? No → 401 Use OAuth login
   - Password valid? No → 401 Invalid credentials
   ↓
4. Profile complete? No → 403 Complete profile first
   ↓
5. Generate JWT token
   → Response with token
   → Frontend stores in localStorage
```

---

## Part 13: API Testing

### 13.1 Test Local Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "contact_person": "John Doe",
    "company_name": "Acme Inc",
    "phone_number": "+1234567890"
  }'
```

### 13.2 Test Local Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 13.3 Test Google Callback (Browser)

```
Visit: http://localhost:5000/api/auth/google
```

### 13.4 Test Complete Profile

```bash
curl -X POST http://localhost:5000/api/auth/complete-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "company_name": "Acme Inc",
    "phone_number": "+1234567890"
  }'
```

### 13.5 Test Get Profile

```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Part 14: Production Deployment

### 14.1 Environment Variables

For production, set these in your deployment platform (Heroku, AWS, Azure, etc.):

```env
GOOGLE_CLIENT_ID=production_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=production_client_secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback
JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRY=24h
NODE_ENV=production
```

### 14.2 Update Redirect URIs in Google Console

For production domain, add to "Authorized redirect URIs":
```
https://api.yourdomain.com/api/auth/google/callback
https://yourdomain.com/auth/google/callback
```

### 14.3 Database Backup Before Migration

```bash
# PostgreSQL
pg_dump -U username dbname > backup_$(date +%Y%m%d).sql

# MySQL
mysqldump -u username -p dbname > backup_$(date +%Y%m%d).sql
```

---

## Part 15: Troubleshooting

### Issue: "Invalid Client ID"

**Solution:**
- Check GOOGLE_CLIENT_ID in .env matches Google Cloud Console
- Ensure Client ID is for "Web application" type
- Verify project has Google+ API enabled

### Issue: "Redirect URI mismatch"

**Solution:**
- Exact match required: http://localhost:5000/api/auth/google/callback
- Check Google Cloud Console → Credentials → Authorized redirect URIs
- No trailing slashes, exact case sensitive match

### Issue: "Token verification failed"

**Solution:**
- Check JWT_SECRET in .env
- Ensure GOOGLE_CLIENT_SECRET is correct
- Check token expiry: JWT_EXPIRY=24h

### Issue: "User with this email already exists"

**Solution:**
- User registered locally first, then tried Google with same email
- Either:
  - Option 1: Delete local user, use Google OAuth
  - Option 2: Update Google OAuth to auto-link (less secure)

### Issue: "Profile incomplete" on login

**Solution:**
- New users must complete profile first
- POST /api/auth/complete-profile with company_name and phone_number
- Then login again with new token

### Issue: CORS errors

**Solution:**
- Add CORS headers in `backend/src/index.js`:
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
```

---

## Part 16: Security Best Practices

### 16.1 Password Requirements

```
✅ Minimum 8 characters
✅ Uppercase letter (A-Z)
✅ Lowercase letter (a-z)
✅ Number (0-9)
❌ No special characters required (but allowed)
```

### 16.2 JWT Security

```javascript
// Use strong secret (minimum 32 characters)
JWT_SECRET=your_super_secret_key_generate_random_string_here

// Set reasonable expiry
JWT_EXPIRY=24h

// Or use RS256 (public/private keys) for production
```

### 16.3 HTTPS in Production

```
✅ Always use HTTPS in production
✅ Set GOOGLE_CALLBACK_URL to https://...
✅ Secure cookies: httpOnly, Secure, SameSite flags
```

### 16.4 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts',
});

router.post('/login', loginLimiter, authController.login);
```

### 16.5 Input Validation

```javascript
// Email validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Password strength
const validatePassword = (password) => {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(password);
};
```

---

## Quick Reference

### Files to Create/Modify

1. ✅ **Database Migration** - `GOOGLE_OAUTH_DATABASE_MIGRATION.sql`
2. ✅ **Passport Config** - `backend/src/config/passport.js`
3. ✅ **Auth Service** - `backend/src/services/authService.js`
4. ✅ **Auth Middleware** - `backend/src/middleware/authMiddleware.js`
5. ✅ **Auth Controller** - `backend/src/controllers/companyUserAuthController.js`
6. ✅ **Auth Routes** - `backend/src/routes/authRoutes.js`
7. ⚙️ **Company Model** - Add methods to `backend/src/models/Company.js`
8. ⚙️ **Main App** - Update `backend/src/index.js`
9. ⚙️ **.env File** - Add Google OAuth variables
10. 🎨 **Frontend Components** - Create login/profile pages

### Key Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | ❌ | Register with email/password |
| `/api/auth/login` | POST | ❌ | Login with email/password |
| `/api/auth/google` | GET | ❌ | Initiate Google OAuth |
| `/api/auth/google/callback` | GET | ❌ | OAuth callback (internal) |
| `/api/auth/complete-profile` | POST | ✅ | Complete profile for new users |
| `/api/auth/profile` | GET | ✅ | Get current user profile |
| `/api/auth/refresh` | POST | ✅ | Refresh JWT token |
| `/api/auth/logout` | POST | ❌ | Logout (client-side cleanup) |

---

## Next Steps

1. ✅ Run database migration
2. ✅ Install NPM packages
3. ✅ Set up Google Cloud OAuth credentials
4. ✅ Create auth service, middleware, controller
5. ✅ Update company model
6. ✅ Create auth routes
7. ✅ Test endpoints with curl
8. ✅ Build frontend components
9. ✅ Test complete flow
10. ✅ Deploy to production

Good luck! 🚀
