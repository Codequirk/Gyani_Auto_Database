# 📧 Email Setup Guide - Company Portal OTP System

## Overview

The Company Portal uses **Gmail SMTP** for sending OTP (One-Time Password) emails during registration. The system has been updated to provide clear guidance when credentials are missing.

---

## 🔧 **Step 1: Enable Gmail App Password**

### Prerequisites
- A Gmail account
- 2-Step Verification enabled (optional but recommended)

### Steps

1. **Go to Google Account Settings:**
   - Visit: https://myaccount.google.com/apppasswords
   - You may be prompted to log in if not already signed in

2. **Select App & Device:**
   - App: **Mail**
   - Device: **Windows Computer** (or your device type)

3. **Generate App Password:**
   - Click **Generate**
   - Google will show you a **16-character password** (e.g., `abcd efgh ijkl mnop`)
   - Copy this password (you'll use it next)

4. **Note:** This is a special password just for Gmail SMTP, not your account password.

---

## 📝 **Step 2: Update Environment Variables**

### Edit `backend/.env` file

Locate these lines (around line 20-24):

**BEFORE (Current):**
```dotenv
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password-here
```

**AFTER (Replace with your actual values):**
```dotenv
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

### Example Configuration

```dotenv
EMAIL_USER=mycompany@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

⚠️ **Important:** 
- Use the **16-character app password** (not your regular Gmail password)
- Remove any spaces from the password
- Do NOT commit `.env` to version control

---

## 🔄 **Step 3: Restart Backend Server**

After updating `.env`, you must restart the backend for changes to take effect.

### On Windows PowerShell:

```powershell
# Stop existing Node process
taskkill /F /IM node.exe

# Wait a moment
Start-Sleep -Seconds 2

# Navigate to backend
cd "C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect\backend"

# Start backend
npm run dev
```

Or using the full command:
```powershell
node src/index.js
```

### Expected Output in Backend Console

When credentials are correctly configured:
```
[EMAIL] ✓ Transporter initialized with Gmail SMTP
[EMAIL] ✓ SMTP connection verified successfully
```

When credentials are missing or wrong:
```
[EMAIL] ❌ CREDENTIALS MISSING!
[EMAIL] EMAIL_USER: ❌ NOT SET
[EMAIL] EMAIL_PASSWORD: ❌ NOT SET
[EMAIL] Please configure EMAIL_USER and EMAIL_PASSWORD in .env
```

---

## ✅ **Step 4: Test Email Delivery**

### Test Registration Flow

1. **Open Company Portal:**
   - Frontend: http://localhost:3000/company
   - Go to `/register` page

2. **Enter Your Email:**
   - Use your actual email address
   - Click "Send OTP"

3. **Check Backend Logs:**
   - You should see: `[EMAIL] ✓ OTP email sent to: your-email@gmail.com`

4. **Check Your Email Inbox:**
   - Look for an email from Gmail SMTP
   - Subject: "Your OTP for Connect Auto Registration"
   - Contains: 6-digit OTP code
   - Valid for: 5 minutes

5. **Complete Registration:**
   - Enter the OTP from your email
   - Continue with profile completion

---

## 🐛 **Troubleshooting**

### Issue: "Email credentials not configured"

**Solution:** 
- Verify `.env` has real Gmail credentials (not placeholders)
- Check there are no spaces in the file
- Restart backend server

### Issue: "SMTP connection failed"

**Possible causes:**
1. **Wrong app password:** Use the 16-character password from Google, not your regular Gmail password
2. **Less secure apps blocked:** Older Gmail accounts may need additional configuration
3. **Firewall blocking:** Check if port 587 is open for SMTP

**Solution:**
- Double-check the app password
- Try generating a new app password from Google
- Check your firewall settings

### Issue: Email arriving in spam folder

**Solution:**
- Mark email as "Not Spam"
- Check Gmail's spam filters
- This is normal for development/test emails

### Issue: "OTP sent" message appears but no email received

**Solution:**
- Check email address spelling
- Look in spam/junk folders
- Check backend logs for error messages
- Verify app password is correct (16 characters, no spaces)

---

## 📊 **Email System Architecture**

### Flow Diagram

```
User Registration Request
    ↓
[RegisterEmailPage.jsx] - Frontend form
    ↓
[POST /api/company-auth/register-email] - Backend endpoint
    ↓
[OTPUtils.createOTP()] - Generate 6-digit code
    ↓
[EmailUtils.sendOTPEmail()] - Send via Gmail SMTP
    ↓
[Nodemailer] - Gmail SMTP connection
    ↓
Gmail Server → User's Inbox
```

### Environment Check

The backend automatically checks:
1. ✓ `EMAIL_USER` is set and not a placeholder
2. ✓ `EMAIL_PASSWORD` is set and not a placeholder
3. ✓ Gmail SMTP connection is working

If any check fails, appropriate error messages are logged.

---

## 🔐 **Security Notes**

1. **Never commit `.env` to git** - It contains sensitive credentials
2. **App passwords are scoped** - They only work with Gmail SMTP, not your account
3. **16-character password** - This is different from your regular Gmail password
4. **Revoke anytime** - You can delete app passwords at https://myaccount.google.com/apppasswords

---

## 📚 **Related Files**

- **Backend email utility:** `backend/src/utils/emailUtils.js`
- **Email sending:** `backend/src/controllers/companyAuthControllerNew.js` (registerEmail method)
- **OTP generation:** `backend/src/utils/otpUtils.js`
- **Frontend form:** `company-portal/src/pages/RegisterEmailPage.jsx`
- **Environment config:** `backend/.env`

---

## ✨ **Next Steps After Email Setup**

1. ✅ Complete email configuration
2. ✅ Test registration with your email
3. ⬜ Test OTP verification
4. ⬜ Test profile completion
5. ⬜ Test login functionality

---

## 📞 **Support**

If you encounter issues:
1. Check backend logs for error messages
2. Verify Gmail app password is correct
3. Ensure `.env` file is properly updated
4. Restart backend server after making changes
5. Check email inbox and spam folder

---

**Last Updated:** December 2025
**Version:** 1.0
