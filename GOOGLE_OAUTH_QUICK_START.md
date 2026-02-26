# Google OAuth Implementation - Quick Start (5-Minute Overview)

## What You're Getting

A complete, production-ready Google OAuth + email/password authentication system for your Node.js/Express backend.

**Features:**
- ✅ Local email/password login
- ✅ Google OAuth login ("Continue with Google")
- ✅ JWT-based authentication
- ✅ Profile completion for new users
- ✅ Secure password hashing
- ✅ Complete error handling
- ✅ Ready for production

---

## Start Here: 3 Simple Steps

### Step 1: Get Google Credentials (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or use existing
3. Enable "Google+ API"
4. Create "OAuth 2.0 Credential" (type: Web Application)
5. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy: Client ID and Client Secret

### Step 2: Update Your Backend (2 minutes)

1. **Install packages:**
   ```bash
   npm install passport passport-google-oauth20 dotenv
   ```

2. **Create `.env` file in backend root:**
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   JWT_SECRET=generate_random_string_here_min_32_chars
   ```

3. **Copy these files to your backend:**
   ```
   backend/src/config/passport.js
   backend/src/services/authService.js
   backend/src/middleware/authMiddleware.js
   ```

4. **Update `backend/src/index.js`:**
   ```javascript
   const passport = require('passport');
   require('./config/passport');
   
   // In middleware section
   app.use(passport.initialize());
   
   // Mount routes
   app.use('/api/auth', require('./routes/authRoutes'));
   ```

### Step 3: Run Database Migration (1 minute)

```bash
mysql < GOOGLE_OAUTH_DATABASE_MIGRATION.sql
```

Done! ✅

---

## Test It (2 minutes)

### Test Local Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "contact_person": "John Doe",
    "company_name": "My Company",
    "phone_number": "+1234567890"
  }'
```

### Test Google OAuth

Open in browser:
```
http://localhost:5000/api/auth/google
```

---

## Frontend (5 minutes)

### Install Packages

```bash
npm install @react-oauth/google axios
```

### Create Auth Service

Create `frontend/src/services/authService.js`:

```javascript
import api from './api';

export default {
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('auth_token', res.data.token);
    return res.data;
  },

  async register(email, password, contact_person, company_name, phone_number) {
    const res = await api.post('/auth/register', {
      email, password, contact_person, company_name, phone_number
    });
    return res.data;
  },

  async completeProfile(company_name, phone_number) {
    const res = await api.post('/auth/complete-profile', { company_name, phone_number });
    localStorage.setItem('auth_token', res.data.token);
    return res.data;
  },

  getGoogleUrl() {
    return `http://localhost:5000/api/auth/google`;
  },

  logout() {
    localStorage.removeItem('auth_token');
  },
};
```

### Create Login Button

```javascript
function LoginPage() {
  const handleGoogle = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <button onClick={handleGoogle} className="btn">
      Continue with Google
    </button>
  );
}
```

---

## All Files Provided

### 📄 Documentation (Read These)
1. `GOOGLE_OAUTH_COMPLETE_PACKAGE.md` - Overview (start here!)
2. `GOOGLE_OAUTH_SETUP_GUIDE.md` - Detailed setup
3. `GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md` - Full guide
4. `GOOGLE_OAUTH_FRONTEND_GUIDE.md` - Frontend examples

### 🔧 Backend Code (Copy These)
1. `backend/src/config/passport.js` - Passport strategies
2. `backend/src/services/authService.js` - Auth logic
3. `backend/src/middleware/authMiddleware.js` - JWT verification
4. `GOOGLE_OAUTH_DATABASE_MIGRATION.sql` - Database schema

---

## What Happens When User Logs In

### With Email/Password
```
User enters email + password
        ↓
POST /api/auth/login
        ↓
Backend verifies password
        ↓
Generate JWT token
        ↓
Return token to frontend
        ↓
Frontend stores in localStorage
        ↓
Access dashboard ✅
```

### With Google
```
User clicks "Continue with Google"
        ↓
Redirect to /api/auth/google
        ↓
Passport initiates OAuth flow
        ↓
User logs in at Google
        ↓
Google redirects to callback
        ↓
Backend creates/finds user
        ↓
Check if profile complete:
  - Yes → Return JWT token
  - No → Redirect to /complete-profile
        ↓
Token in localStorage
        ↓
Access dashboard ✅
```

---

## API Endpoints

```
POST   /api/auth/register              → Register with email/password
POST   /api/auth/login                 → Login with email/password
GET    /api/auth/google                → Start Google OAuth
GET    /api/auth/google/callback       → Google redirects here
POST   /api/auth/complete-profile      → Complete profile (requires JWT)
GET    /api/auth/profile               → Get user profile (requires JWT)
POST   /api/auth/refresh               → Refresh JWT token
POST   /api/auth/logout                → Logout
```

---

## Database Changes

**New Columns Added to `companies` Table:**
```
google_id             - Google user ID (unique)
auth_provider         - 'local' or 'google'
is_profile_complete   - true/false
created_at            - Timestamp
updated_at            - Timestamp
```

**New Indexes:**
- `idx_companies_google_id`
- `idx_companies_auth_provider`
- `idx_companies_profile_complete`

---

## Environment Variables (.env)

```env
# Required
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
JWT_SECRET=random_string_32_chars_minimum

# Optional
JWT_EXPIRY=24h
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
NODE_ENV=development
```

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Redirect URI mismatch" | Check exact URL match in Google Cloud Console |
| "Invalid credentials" | Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env |
| "User exists" | Check database for duplicate email |
| "Token invalid" | Clear localStorage and login again |
| "Profile incomplete" | New users must complete profile first |

---

## Next: Read This Document

For detailed implementation instructions:
👉 **GOOGLE_OAUTH_SETUP_GUIDE.md**

---

## That's It!

You now have everything needed to add Google OAuth to your system.

The implementation is:
- ✅ Production-ready
- ✅ Secure
- ✅ Well-documented
- ✅ Easy to integrate

Good luck! 🚀
