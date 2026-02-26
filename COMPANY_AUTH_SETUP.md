# Company Portal Authentication System - Setup Guide

## Overview
Production-level OTP + Email verification authentication system for company portal with Google OAuth and password reset functionality.

## Backend Architecture

### Database Schema

#### `company_users` table
```sql
- id (UUID, primary)
- email (string, unique)
- password (text, nullable) - bcrypt hashed
- google_id (string, nullable) - for Google OAuth
- company_name (string)
- phone_number (string)
- company_person (string) - contact person name
- is_verified (boolean) - email verification status
- verified_at (timestamp)
- reset_token (text, nullable) - password reset token
- reset_token_expires_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- last_login (timestamp)
- deleted_at (timestamp, nullable) - soft delete
```

#### `company_otps` table
```sql
- id (UUID, primary)
- email (string)
- otp (string) - 6-digit OTP
- expires_at (timestamp) - 5-minute expiry
- created_at (timestamp)
- attempts (integer)
- last_attempt (timestamp)
```

### Files Created

**Models:**
- `backend/src/models/CompanyUser.js` - User data access layer

**Controllers:**
- `backend/src/controllers/companyAuthControllerNew.js` - Auth logic

**Routes:**
- `backend/src/routes/companyAuthRoutes.js` - Auth endpoints

**Middleware:**
- `backend/src/middleware/companyAuthMiddleware.js` - JWT validation

**Utilities:**
- `backend/src/utils/otpUtils.js` - OTP generation & verification
- `backend/src/utils/emailUtils.js` - Email sending via Gmail SMTP
- `backend/src/utils/passwordUtils.js` - Password hashing & validation

**Migrations:**
- `backend/src/migrations/007_create_company_users.js`
- `backend/src/migrations/008_create_company_otps.js`

## Setup Instructions

### Step 1: Environment Variables

Update `backend/.env`:

```env
# Email Configuration (REQUIRED)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password-here
COMPANY_PORTAL_URL=http://localhost:3001

# JWT (already configured)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**Important:** Use Gmail App Password, NOT regular Gmail password
- Go to https://myaccount.google.com/apppasswords
- Generate a new app password for "Mail"
- Use the generated password in EMAIL_PASSWORD

### Step 2: Run Migrations

```bash
cd backend
npm run migrate
# This will create both company_users and company_otps tables
```

### Step 3: Install Dependencies

Backend dependencies already included:
- `nodemailer` - Email sending
- `bcrypt` - Password hashing
- `jwt` - Authentication tokens

Frontend will need:
- `axios` - API calls (likely already installed)
- `react-router-dom` - Navigation (already installed)

### Step 4: Restart Backend

```bash
cd backend
npm run dev
```

The email transporter will initialize on startup.

## API Endpoints

### Public Endpoints

#### 1. Register Email (Step 1)
```
POST /api/company-auth/register-email
Body: { email: "company@example.com" }
Response: { message, email, action: "verify_otp" }
```

#### 2. Verify OTP (Step 2)
```
POST /api/company-auth/verify-otp
Body: { email, otp: "123456" }
Response: { message, user: { id, email }, action: "complete_profile" }
```

#### 3. Complete Profile (Step 3)
```
POST /api/company-auth/complete-profile
Body: {
  userId,
  password: "SecurePass123!",
  company_name: "ABC Transport",
  phone_number: "9876543210",
  company_person: "John Doe"
}
Response: { message, token, user }
```

#### 4. Login
```
POST /api/company-auth/login
Body: { email, password }
Response: { message, token, user }
```

#### 5. Google Login
```
POST /api/company-auth/google-login
Body: { email, googleId, displayName }
Response: { message, token, user } OR { message, user, action: "complete_profile" }
```

#### 6. Request Password Reset
```
POST /api/company-auth/request-password-reset
Body: { email }
Response: { message: "If email exists, reset link has been sent" }
```

#### 7. Reset Password
```
POST /api/company-auth/reset-password
Body: { token, newPassword: "NewPass123!" }
Response: { message: "Password reset successful..." }
```

### Protected Endpoints (require company_auth_token)

#### Get Profile
```
GET /api/company-auth/profile
Headers: { Authorization: "Bearer {token}" }
Response: { user: { id, email, company_name, ... } }
```

#### Logout
```
POST /api/company-auth/logout
Headers: { Authorization: "Bearer {token}" }
Response: { message: "Logged out successfully" }
```

## Registration Flow

### OTP-based Registration (Email + Password)

```
User enters email
    ↓
Check if email exists
    ↓ (if new)
Generate 6-digit OTP
    ↓
Send OTP via Gmail SMTP
    ↓
User enters OTP
    ↓
OTP verified, create unverified user
    ↓
User enters: password + company details
    ↓
Hash password with bcrypt
    ↓
Mark user as verified
    ↓
Send welcome email
    ↓
Generate JWT token
    ↓
User logged in ✓
```

### Google OAuth Registration

```
User clicks "Sign in with Google"
    ↓
Google returns: email, googleId, displayName
    ↓
Check if user exists by googleId
    ↓ (if new)
Create user with verified=true (auto-verified)
    ↓
User needs to complete profile: company_name, phone_number, company_person
    ↓
Hash password (if setting one) with bcrypt
    ↓
Send welcome email
    ↓
Generate JWT token
    ↓
User logged in ✓
```

### Password Reset Flow

```
User clicks "Forgot Password"
    ↓
User enters email
    ↓
Check if user exists
    ↓
Generate secure reset token
    ↓
Hash token for storage
    ↓
Send reset email with link + token (1 hour expiry)
    ↓
User clicks link, enters new password
    ↓
Validate password strength
    ↓
Hash new password
    ↓
Update database, clear reset token
    ↓
Success message
    ↓
User logs in with new password ✓
```

## Security Features

### Password Security
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)
- Hashed with bcrypt (10 rounds)

### OTP Security
- 6-digit random number
- 5-minute expiry
- Automatically deleted after verification
- Expired OTPs cleaned up periodically

### Token Security
- JWT with HS256 algorithm
- 30-day expiry for login tokens
- 1-hour expiry for incomplete profile tokens
- 1-hour expiry for password reset links

### Email Security
- Gmail SMTP only (enterprise-grade)
- App password required (not regular password)
- HTML email templates (no plain text secrets)
- Reset tokens hashed with SHA256 before storage

## Error Handling

### 400 Bad Request
- Missing required fields
- Invalid email format
- Weak password
- Invalid OTP format

### 401 Unauthorized
- Invalid credentials
- Expired token
- Invalid OTP
- Missing token

### 403 Forbidden
- Email not verified
- Profile incomplete
- Wrong token type

### 409 Conflict
- Email already registered
- Duplicate email

### 500 Server Error
- Email sending failed
- Database errors
- JWT generation errors

All errors include descriptive messages for frontend handling.

## Frontend Implementation (Next Steps)

### Pages to Create:
1. `RegisterEmailPage` - Email input
2. `VerifyOTPPage` - OTP input  
3. `CompleteProfilePage` - Password + company details
4. `CompanyLoginPage` - Email + password
5. `ForgotPasswordPage` - Email input
6. `ResetPasswordPage` - New password

### Key Points:
- Store `company_auth_token` in localStorage
- Use `Authorization: Bearer {token}` header
- Handle "action" field in responses for flow control
- Validate passwords before submission
- Show password strength indicator

## Testing

### Test Credentials (after setup):
```
Email: test@example.com
Password: TestPass123!
Company: Test Company
Phone: 9876543210
Person: Test Person
```

### Manual Test Flow:
1. POST /register-email with test email
2. Check email/logs for OTP
3. POST /verify-otp with OTP
4. POST /complete-profile with details
5. POST /login with email + password
6. Use returned token for protected endpoints

### Email Testing:
If Gmail not configured:
- OTP still generated (check database)
- Email sending will fail gracefully
- Logs will show email sending error

## Troubleshooting

### "Email sending failed"
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- Verify Gmail 2FA is enabled
- Generate new App Password
- Allow "Less secure app access" if using regular password

### "OTP verification failed"
- Check if OTP expired (5-minute window)
- Verify OTP matches exactly (case-sensitive number string)
- Check database for OTP record

### "Token invalid"
- Check if token expired (30 days)
- Verify token format: `Bearer {token}`
- Check Authorization header casing

### "Database connection error"
- Verify PostgreSQL running
- Check DB credentials in .env
- Run migrations: `npm run migrate`

## Production Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Use production email credentials
- [ ] Set NODE_ENV=production
- [ ] Update COMPANY_PORTAL_URL to production URL
- [ ] Test email sending with real Gmail account
- [ ] Implement rate limiting for OTP requests
- [ ] Add CSRF protection
- [ ] Use HTTPS only
- [ ] Implement password history (prevent reuse)
- [ ] Add 2FA for admin accounts
- [ ] Monitor OTP verification failures
- [ ] Set up email bounce handling

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - SMS-based OTP
   - TOTP apps (Google Authenticator)

2. **Social Logins**
   - GitHub OAuth
   - LinkedIn OAuth
   - Microsoft OAuth

3. **Advanced Security**
   - Passwordless authentication (magic links)
   - Biometric login
   - Device fingerprinting

4. **Account Management**
   - Email change with verification
   - Phone number updates
   - Profile picture uploads

5. **Notifications**
   - Login alerts
   - Failed login attempts
   - Account activity log

## Support Files Reference

- Environment setup: `backend/.env`
- Database config: `backend/knexfile.js`
- Passport config: `backend/src/config/passport.js`
- Error handling: `backend/src/middleware/errorHandler.js`
