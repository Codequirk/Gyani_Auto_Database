/**
 * Company Auth Routes - OTP Based Authentication
 * Includes: Email registration, OTP verification, Profile completion, Login, Google OAuth, Password Reset
 */

const express = require('express');
const router = express.Router();
const CompanyAuthController = require('../controllers/companyAuthControllerNew');
const companyAuthMiddleware = require('../middleware/companyAuth');

/**
 * PUBLIC ROUTES
 */

// Step 1: Submit email for OTP
router.post('/register-email', CompanyAuthController.registerEmail);

// Step 2: Verify OTP and create account
router.post('/verify-otp', CompanyAuthController.verifyOTP);

// Step 3: Complete profile with password and company details
router.post('/complete-profile', CompanyAuthController.completeProfile);

// Login with email and password
router.post('/login', CompanyAuthController.login);

// Google OAuth login with JWT credential
router.post('/google', CompanyAuthController.google);

// Google OAuth login with email/googleId
router.post('/google-login', CompanyAuthController.googleLogin);

// Request password reset email
router.post('/request-password-reset', CompanyAuthController.requestPasswordReset);

// Reset password with token
router.post('/reset-password', CompanyAuthController.resetPassword);

/**
 * PROTECTED ROUTES (require company auth)
 */

// Get current user profile
router.get('/profile', companyAuthMiddleware, async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.company.id,
        email: req.company.email,
        company_name: req.company.company_name,
        phone_number: req.company.phone_number,
        company_person: req.company.company_person,
        is_verified: req.company.is_verified,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', companyAuthMiddleware, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
