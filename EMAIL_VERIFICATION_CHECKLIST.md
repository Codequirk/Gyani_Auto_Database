# ✅ Email Configuration Verification Checklist

Use this checklist to ensure your email setup is correct.

## Pre-Setup Checklist

- [ ] You have a Gmail account
- [ ] You can access https://myaccount.google.com/apppasswords
- [ ] You have a text editor to modify `.env` file
- [ ] Backend server is running

---

## Step 1: Gmail App Password Setup

- [ ] Opened https://myaccount.google.com/apppasswords
- [ ] Selected "Mail" as the app
- [ ] Selected "Windows Computer" as the device
- [ ] Clicked "Generate"
- [ ] Got a 16-character password (e.g., `abcd efgh ijkl mnop`)
- [ ] Copied the password somewhere safe

---

## Step 2: Update Backend Configuration

### Open `backend/.env` file

- [ ] Located file at: `backend/.env`
- [ ] Opened file in text editor

### Verify Current Values (Before Update)

**Line ~20:**
- [ ] Current: `EMAIL_USER=your-gmail@gmail.com` (placeholder)
- [ ] Current: `EMAIL_PASSWORD=your-app-password-here` (placeholder)

### Update with Real Values

**After Update:**
- [ ] `EMAIL_USER=your-actual-gmail@gmail.com` (your real Gmail)
- [ ] `EMAIL_PASSWORD=your-16-char-app-password` (from step 1)
- [ ] No spaces in the password
- [ ] No quotes around values (unless they have special chars)
- [ ] File saved

### Example Configuration

```dotenv
EMAIL_USER=mycompany@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

- [ ] Configuration looks correct
- [ ] File saved successfully

---

## Step 3: Restart Backend Server

### Stop Current Process

- [ ] Opened PowerShell
- [ ] Ran: `taskkill /F /IM node.exe`
- [ ] Waited 2-3 seconds

### Start Backend Again

- [ ] Navigated to: `C:\Users\pragn.LAPTOP-DAHFBVDA\OneDrive\Documents\Connect\backend`
- [ ] Ran: `npm run dev` or `node src/index.js`
- [ ] Backend is running and listening on port 5000

### Check Startup Logs

Look for one of these messages in backend console:

**✅ Success (Credentials Configured):**
```
[EMAIL] ✓ Transporter initialized with Gmail SMTP
[EMAIL] ✓ SMTP connection verified successfully
```

**❌ Failure (Credentials Missing):**
```
[EMAIL] ❌ CREDENTIALS MISSING!
```

- [ ] Backend logs show SMTP connection verified
- [ ] No email credential error messages

---

## Step 4: Test Email System

### Test via Frontend

1. **Open Company Portal:**
   - [ ] Frontend running at http://localhost:3000
   - [ ] Company portal at http://localhost:3000/company

2. **Test Registration:**
   - [ ] Go to `/register` page
   - [ ] Enter a **real email address** you have access to
   - [ ] Click "Send OTP"
   - [ ] Frontend shows: "OTP sent to your email"

3. **Check Backend Logs:**
   - [ ] Backend shows: `[EMAIL] ✓ OTP email sent to: your-email@gmail.com`
   - [ ] Backend shows: `[BACKEND REGISTER-EMAIL] SUCCESS`
   - [ ] OTP code is logged (e.g., `🔐 OTP Code: 123456`)

4. **Check Your Email:**
   - [ ] Email received in inbox (not spam folder)
   - [ ] From: Gmail SMTP sender
   - [ ] Subject: "Your OTP for Connect Auto Registration"
   - [ ] Contains: 6-digit OTP code
   - [ ] Valid for: 5 minutes

5. **Complete Verification:**
   - [ ] Copy OTP from email
   - [ ] Go to `/verify-otp` page
   - [ ] Enter OTP
   - [ ] Click "Verify"
   - [ ] Page shows: "Email verified successfully"

---

## Troubleshooting Checklist

### Email Not Received

- [ ] Check spam/junk folder
- [ ] Check email address spelling in form
- [ ] Backend logs show successful send
- [ ] Check if email is in a different inbox (if using multiple accounts)
- [ ] Wait 2-3 minutes (email can take a moment)

### Backend Shows Credential Error

- [ ] Open `backend/.env` file
- [ ] Check: `EMAIL_USER` is set to your real Gmail
- [ ] Check: `EMAIL_PASSWORD` is set to 16-character app password
- [ ] Check: No placeholder values remain
- [ ] Check: File is saved
- [ ] Restart backend server
- [ ] Check logs again

### SMTP Connection Failed

- [ ] Verify app password is correct (16 characters)
- [ ] Try generating a new app password in Google
- [ ] Check Gmail account security settings
- [ ] Verify firewall allows port 587 outbound

### Email in Spam Folder

- [ ] This is normal for development emails
- [ ] Mark email as "Not Spam" in Gmail
- [ ] Future emails from same sender may be marked correctly

---

## Final Verification

- [ ] ✅ Backend logs show SMTP verified
- [ ] ✅ Frontend registration page works
- [ ] ✅ Email received for test registration
- [ ] ✅ OTP verification page accepts code
- [ ] ✅ Profile completion page loads

---

## Next Steps

After email setup is complete:

1. Test full registration flow:
   - [ ] Register with email
   - [ ] Verify OTP
   - [ ] Complete profile (password + company info)
   - [ ] Login with credentials

2. Test password reset:
   - [ ] Go to forgot password page
   - [ ] Enter email
   - [ ] Receive reset OTP
   - [ ] Complete password reset

3. Test company login:
   - [ ] Login with registered email and password
   - [ ] Access company portal features

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Email credentials not configured" | Missing real credentials | Update `.env` with Gmail + app password |
| Email not received | Credentials wrong | Verify 16-char app password, no spaces |
| SMTP connection failed | Port blocked | Check firewall, try different network |
| Email in spam | Normal for test | Mark as "Not Spam", it will be trusted next time |
| OTP expired | Took too long | OTP valid for 5 minutes only, regenerate |

---

## Summary

✅ **Setup Complete When:**
1. Backend logs show "SMTP connection verified"
2. Test email is received in your inbox
3. OTP verification works
4. No error messages in backend

🎉 **Email system is now fully operational!**

---

*Created: December 2025*
*Last Updated: December 2025*
