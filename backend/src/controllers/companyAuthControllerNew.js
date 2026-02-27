/**
 * Company Portal Authentication Controller - OTP Based
 * Handles: Email OTP registration, Email verification, Profile completion, Login, Google OAuth, Password Reset
 */

const jwt = require('jsonwebtoken');
const db = require('../models/db');
const CompanyUser = require('../models/CompanyUser');
const Company = require('../models/Company');
const OTPUtils = require('../utils/otpUtils');
const EmailUtils = require('../utils/emailUtils');
const PasswordUtils = require('../utils/passwordUtils');

class CompanyAuthController {
  /**
   * POST /api/company-auth/register-email
   * Step 1: User submits email
   */
  static async registerEmail(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      console.log('\n========== [BACKEND REGISTER-EMAIL] RECEIVED REQUEST =========');
      console.log('[BACKEND REGISTER-EMAIL] Email:', email);
      console.log('[BACKEND REGISTER-EMAIL] Email registration attempt...');

      const existingUser = await CompanyUser.findByEmail(email);
      if (existingUser && existingUser.is_verified) {
        console.log('[BACKEND REGISTER-EMAIL] ❌ Email already registered and verified');
        return res.status(409).json({
          error: 'Email already registered. Please login instead.',
          action: 'login',
        });
      }

      if (existingUser && !existingUser.is_verified) {
        console.log('[BACKEND REGISTER-EMAIL] Found old unverified account, deleting...');
        await CompanyUser.softDelete(existingUser.id);
      }

      console.log('[BACKEND REGISTER-EMAIL] Creating OTP...');
      const otp = await OTPUtils.createOTP(email, 5);
      console.log('[BACKEND REGISTER-EMAIL] ✓ OTP created:', otp);

      console.log('[BACKEND REGISTER-EMAIL] Sending OTP email...');
      try {
        await EmailUtils.sendOTPEmail(email, otp);
        console.log('[BACKEND REGISTER-EMAIL] ✓ OTP email sent successfully');
      } catch (emailError) {
        console.error('[BACKEND REGISTER-EMAIL] ❌ Email Error:', emailError.message);
        console.error('[BACKEND REGISTER-EMAIL] Note: OTP was created but email delivery failed');
        // Check if it's a credentials error
        if (emailError.message.includes('credentials not configured')) {
          return res.status(500).json({
            error: 'Email service not configured',
            details: 'Please configure EMAIL_USER and EMAIL_PASSWORD in environment variables',
            code: 'EMAIL_CONFIG_ERROR'
          });
        }
        return res.status(500).json({ error: 'Failed to send OTP email' });
      }

      console.log('[BACKEND REGISTER-EMAIL] 🔐 OTP Code: ' + otp + ' (valid for 5 minutes)');
      console.log('========== [BACKEND REGISTER-EMAIL] SUCCESS =========\n');

      res.json({
        message: 'OTP sent to your email',
        email,
        action: 'verify_otp',
      });
    } catch (error) {
      console.error('[BACKEND REGISTER-EMAIL] ❌ Error:', error);
      console.log('========== [BACKEND REGISTER-EMAIL] FAILED =========\n');
      next(error);
    }
  }

  /**
   * POST /api/company-auth/verify-otp
   * Step 2: User submits OTP
   */
  static async verifyOTP(req, res, next) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }

      console.log('[COMPANY-AUTH] OTP verification attempt for:', email);

      const otpResult = await OTPUtils.verifyOTP(email, otp);
      if (!otpResult.valid) {
        return res.status(401).json({ error: otpResult.error });
      }

      let user = await CompanyUser.findByEmail(email);
      
      if (!user) {
        user = await CompanyUser.create({
          email,
          is_verified: false,
        });
        console.log('[COMPANY-AUTH] New user created:', user.id);
      }

      console.log('[COMPANY-AUTH] OTP verified for:', email);

      res.json({
        message: 'OTP verified successfully',
        user: {
          id: user.id,
          email: user.email,
        },
        action: 'complete_profile',
      });
    } catch (error) {
      console.error('[COMPANY-AUTH] Verify OTP error:', error);
      next(error);
    }
  }

  /**
   * POST /api/company-auth/complete-profile
   * Step 3: User completes profile
   */
  static async completeProfile(req, res, next) {
    try {
      // Support both userId and user_id for flexibility
      const userId = req.body.userId || req.body.user_id;
      const { password, company_name, phone_number, company_person } = req.body;

      if (!userId || !password || !company_name || !phone_number || !company_person) {
        return res.status(400).json({
          error: 'All fields are required',
          received: { userId, password: !!password, company_name, phone_number, company_person },
        });
      }

      const passwordValidation = PasswordUtils.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Password is not strong enough',
          details: passwordValidation.errors,
        });
      }

      console.log('[COMPANY-AUTH] Profile completion for user:', userId);

      const user = await CompanyUser.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hashedPassword = await PasswordUtils.hashPassword(password);

      const updatedUser = await CompanyUser.update(userId, {
        password: hashedPassword,
        company_name,
        phone_number,
        company_person,
        is_verified: true,
        verified_at: new Date(),
      });

      console.log('[COMPANY-AUTH] Profile completed for:', user.email);

      // Create corresponding Company record if it doesn't exist
      let company = await Company.findByEmail(user.email);
      if (!company) {
        try {
          console.log('[COMPANY-AUTH] Creating Company record for:', user.email);
          company = await Company.create({
            name: company_name,
            email: user.email,
            password_hash: hashedPassword,
            contact_person: company_person,
            phone_number: phone_number,
            status: 'REQUESTED',
            company_status: 'PENDING_APPROVAL',
          });
          console.log('[COMPANY-AUTH] Company record created with ID:', company?.id);
          if (!company) {
            console.error('[COMPANY-AUTH] Failed to create company record - returned null');
            return res.status(500).json({ error: 'Failed to create company record' });
          }
        } catch (err) {
          console.error('[COMPANY-AUTH] Error creating company record:', err);
          throw err;
        }
      }

      await EmailUtils.sendWelcomeEmail(user.email, company_name);

      const token = jwt.sign(
        {
          type: 'company',
          user_id: updatedUser.id,
          company_id: company.id,
          email: updatedUser.email,
          company_name: updatedUser.company_name,
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log('[COMPANY-AUTH] Token created with company_id:', company.id);

      res.json({
        message: 'Registration completed successfully',
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          company_name: updatedUser.company_name,
          phone_number: phone_number,
          company_person: company_person,
          company_id: company.id,
          company_status: company.company_status,
        },
      });
    } catch (error) {
      console.error('[COMPANY-AUTH] Complete profile error:', error);
      next(error);
    }
  }

  /**
   * POST /api/company-auth/login
   * Login with email + password
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      console.log('\n========== [COMPANY-AUTH LOGIN] START ==========');
      console.log('[COMPANY-AUTH] Received email:', email);
      console.log('[COMPANY-AUTH] Received password: (length=' + (password ? password.length : 0) + ')');

      if (!email || !password) {
        console.log('[COMPANY-AUTH] ❌ Missing required fields');
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      // Normalize email to lowercase for consistent lookups
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[COMPANY-AUTH] Normalized email:', normalizedEmail);

      // First, try the new OTP-based CompanyUser system
      console.log('[COMPANY-AUTH] Step 1: Looking up CompanyUser...');
      const user = await CompanyUser.findByEmailWithPassword(normalizedEmail);
      
      if (user) {
        console.log('[COMPANY-AUTH] ✓ Found CompanyUser in database');
        console.log('[COMPANY-AUTH] CompanyUser data:', {
          id: user.id,
          email: user.email,
          is_verified: user.is_verified,
          has_password: !!user.password,
          company_name: user.company_name,
          phone_number: user.phone_number,
          company_person: user.company_person,
        });

        if (!user.is_verified) {
          console.log('[COMPANY-AUTH] ❌ User not verified');
          return res.status(403).json({
            error: 'Email not verified. Please complete registration.',
            action: 'complete_registration',
          });
        }
        console.log('[COMPANY-AUTH] ✓ User is verified');

        const profileComplete = await CompanyUser.isProfileComplete(user.id);
        console.log('[COMPANY-AUTH] Profile complete:', profileComplete);
        
        if (!profileComplete) {
          console.log('[COMPANY-AUTH] ❌ Profile incomplete');
          return res.status(403).json({
            error: 'Please complete your profile',
            action: 'complete_profile',
          });
        }
        console.log('[COMPANY-AUTH] ✓ Profile is complete');

        // Compare passwords
        console.log('[COMPANY-AUTH] Step 2: Comparing passwords...');
        console.log('[COMPANY-AUTH] Password entered: ' + password);
        console.log('[COMPANY-AUTH] Hashed password in DB: ' + user.password.substring(0, 20) + '...');
        
        const passwordMatch = await PasswordUtils.comparePassword(password, user.password);
        console.log('[COMPANY-AUTH] Password match result:', passwordMatch);
        
        if (!passwordMatch) {
          console.log('[COMPANY-AUTH] ❌ Password mismatch');
          console.log('========== [COMPANY-AUTH LOGIN] FAILED - PASSWORD MISMATCH ==========\n');
          return res.status(401).json({ error: 'Invalid email or password' });
        }
        console.log('[COMPANY-AUTH] ✓ Password matches');

        await CompanyUser.updateLastLogin(user.id);

        // Fetch company record to get approval status and ID for token
        console.log('[COMPANY-AUTH] Step 3: Fetching Company record...');
        const company = await Company.findByEmail(normalizedEmail);
        
        if (!company) {
          console.log('[COMPANY-AUTH] ❌ Company record not found');
          return res.status(404).json({ error: 'Company record not found' });
        }
        console.log('[COMPANY-AUTH] ✓ Found Company record:', company.id);

        const token = jwt.sign(
          {
            type: 'company',
            user_id: user.id,
            company_id: company.id,
            email: user.email,
            company_name: user.company_name,
          },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );

        console.log('[COMPANY-AUTH] ✓ JWT Token generated');
        console.log('========== [COMPANY-AUTH LOGIN] SUCCESS ==========\n');

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            company_name: user.company_name,
            phone_number: user.phone_number,
            company_person: user.company_person,
            company_id: company.id,
            company_status: company.company_status,
          },
        });
      } else {
        console.log('[COMPANY-AUTH] ⚠️ CompanyUser NOT found in database');
        console.log('========== [COMPANY-AUTH LOGIN] FAILED - USER NOT FOUND ==========\n');
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } catch (error) {
      console.error('[COMPANY-AUTH] ❌ Unexpected error:', error.message);
      console.error('[COMPANY-AUTH] Stack:', error.stack);
      console.log('========== [COMPANY-AUTH LOGIN] ERROR ==========\n');
      next(error);
    }
  }

  /**
   * POST /api/company-auth/google-login
   * Google OAuth login
   */
  static async googleLogin(req, res, next) {
    try {
      const { email, googleId, displayName } = req.body;

      if (!email || !googleId) {
        return res.status(400).json({
          error: 'Email and Google ID are required',
        });
      }

      console.log('[COMPANY-AUTH] Google login attempt:', email);

      let user = await CompanyUser.findByGoogleId(googleId);
      
      if (!user) {
        user = await CompanyUser.findByEmail(email);
      }

      if (user && user.is_verified) {
        const profileComplete = await CompanyUser.isProfileComplete(user.id);
        
        if (profileComplete) {
          if (!user.google_id) {
            user = await CompanyUser.update(user.id, { google_id: googleId });
          }

          await CompanyUser.updateLastLogin(user.id);

          const token = jwt.sign(
            {
              type: 'company',
              user_id: user.id,
              email: user.email,
              company_name: user.company_name,
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
          );

          console.log('[COMPANY-AUTH] Google login successful:', email);

          return res.json({
            message: 'Google login successful',
            token,
            user: {
              id: user.id,
              email: user.email,
              company_name: user.company_name,
              phone_number: user.phone_number,
              company_person: user.company_person,
            },
          });
        } else {
          return res.json({
            message: 'Profile incomplete',
            user: {
              id: user.id,
              email: user.email,
            },
            action: 'complete_profile',
          });
        }
      }

      if (!user) {
        user = await CompanyUser.create({
          email,
          google_id: googleId,
          is_verified: true,
          verified_at: new Date(),
        });

        console.log('[COMPANY-AUTH] New Google user created:', user.id);

        return res.json({
          message: 'New account created. Please complete your profile.',
          user: {
            id: user.id,
            email: user.email,
          },
          action: 'complete_profile',
        });
      }

      return res.json({
        message: 'User account exists. Completing verification...',
        user: {
          id: user.id,
          email: user.email,
        },
        action: 'complete_profile',
      });
    } catch (error) {
      console.error('[COMPANY-AUTH] Google login error:', error);
      next(error);
    }
  }

  /**
   * POST /api/company-auth/request-password-reset
   * Request password reset
   */
  static async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      console.log('[COMPANY-AUTH] Password reset request:', email);

      const user = await CompanyUser.findByEmail(email);
      if (!user) {
        return res.json({
          message: 'If email exists, reset link has been sent',
        });
      }

      const resetToken = PasswordUtils.generateResetToken();
      const hashedToken = PasswordUtils.hashResetToken(resetToken);

      await db('company_users')
        .where({ id: user.id })
        .update({
          reset_token: hashedToken,
          reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
        });

      const emailResult = await EmailUtils.sendPasswordResetEmail(email, resetToken);
      if (!emailResult.success) {
        console.error('[COMPANY-AUTH] Failed to send reset email:', emailResult.error);
        return res.status(500).json({ error: 'Failed to send reset email' });
      }

      res.json({
        message: 'If email exists, reset link has been sent',
      });
    } catch (error) {
      console.error('[COMPANY-AUTH] Password reset request error:', error);
      next(error);
    }
  }

  /**
   * POST /api/company-auth/reset-password
   * Reset password with token
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: 'Token and new password are required',
        });
      }

      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: 'Password is not strong enough',
          details: passwordValidation.errors,
        });
      }

      console.log('[COMPANY-AUTH] Password reset with token');

      const hashedToken = PasswordUtils.hashResetToken(token);

      const user = await db('company_users')
        .where({ reset_token: hashedToken })
        .where('reset_token_expires_at', '>', new Date())
        .first();

      if (!user) {
        return res.status(401).json({
          error: 'Invalid or expired reset token',
        });
      }

      const hashedPassword = await PasswordUtils.hashPassword(newPassword);

      await CompanyUser.update(user.id, {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
      });

      console.log('[COMPANY-AUTH] Password reset successful for:', user.email);

      res.json({
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error) {
      console.error('[COMPANY-AUTH] Reset password error:', error);
      next(error);
    }
  }

  /**
   * POST /api/company-auth/google
   * Google OAuth login with JWT credential from frontend
   */
  static async google(req, res, next) {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({ error: 'Google credential is required' });
      }

      console.log('[COMPANY-AUTH] Google OAuth login attempt with credential');

      // Decode JWT without verification (we trust Google's signature)
      const decoded = jwt.decode(credential);
      
      if (!decoded || !decoded.email) {
        return res.status(400).json({ error: 'Invalid Google credential' });
      }

      const { email, sub: googleId, name: displayName } = decoded;

      console.log('[COMPANY-AUTH] Decoded Google credential:', { email, googleId });

      let user = await CompanyUser.findByGoogleId(googleId);
      
      if (!user) {
        user = await CompanyUser.findByEmail(email);
      }

      if (user && user.is_verified) {
        // First, check if a Company record exists for this email
        let company = await Company.findByEmail(email);

        // If company exists and is approved, allow login even if profile fields are incomplete
        // This handles pre-existing companies created before the CompanyUser system
        const isApprovedCompany = company && (
          company.company_status === 'ACTIVE' || 
          company.company_status === 'APPROVED' ||
          company.status === 'ACTIVE' ||
          company.status === 'APPROVED'
        );

        if (isApprovedCompany) {
          // Approved existing company - log them in directly
          if (!user.google_id) {
            user = await CompanyUser.update(user.id, { google_id: googleId });
          }

          await CompanyUser.updateLastLogin(user.id);

          const token = jwt.sign(
            {
              type: 'company',
              user_id: user.id,
              email: user.email,
              company_name: user.company_name || company.name,
              company_id: company.id,
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
          );

          console.log('[COMPANY-AUTH] Google login successful (approved company):', email, 'with company_id:', company.id);

          return res.json({
            message: 'Google login successful',
            token,
            company: {
              id: company.id,
              name: company.name,
              email: company.email,
              company_name: company.name,
              phone_number: company.phone_number,
              contact_person: company.contact_person,
              company_person: company.contact_person,
              company_status: company.company_status,
              status: company.company_status,
              rejection_reason: company.rejection_reason,
            },
          });
        }

        // For non-approved companies or pending registrations, check profile completeness
        const profileComplete = await CompanyUser.isProfileComplete(user.id);
        
        if (profileComplete) {
          if (!user.google_id) {
            user = await CompanyUser.update(user.id, { google_id: googleId });
          }

          await CompanyUser.updateLastLogin(user.id);

          // Fetch company data from Company table (not from user)
          if (!company) {
            // Try to find by email if no company_id is set
            company = await Company.findByEmail(user.email);
          }

          const token = jwt.sign(
            {
              type: 'company',
              user_id: user.id,
              email: user.email,
              company_name: user.company_name,
              company_id: company?.id,
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
          );

          console.log('[COMPANY-AUTH] Google login successful:', email, 'with company_id:', company?.id);

          return res.json({
            message: 'Google login successful',
            token,
            company: {
              id: company?.id,
              name: company?.name,
              email: company?.email,
              company_name: company?.name,
              phone_number: company?.phone_number,
              contact_person: company?.contact_person,
              company_person: company?.contact_person,
              company_status: company?.company_status || 'PENDING_APPROVAL',
              status: company?.company_status || 'PENDING_APPROVAL',
              rejection_reason: company?.rejection_reason,
            },
          });
        } else {
          // Profile incomplete, need to complete it
          const tempToken = jwt.sign(
            { type: 'company', user_id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          );

          return res.json({
            redirectTo: '/complete-profile',
            token: tempToken,
            email: user.email,
            name: displayName || user.company_name,
          });
        }
      }

      if (!user) {
        // Create new user for Google OAuth
        user = await CompanyUser.create({
          email,
          google_id: googleId,
          is_verified: true,
          verified_at: new Date(),
        });

        console.log('[COMPANY-AUTH] New Google user created:', user.id);

        const tempToken = jwt.sign(
          { type: 'company', user_id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        return res.json({
          redirectTo: '/complete-profile',
          token: tempToken,
          email: user.email,
          name: displayName,
        });
      }

      return res.status(400).json({ error: 'Unable to process Google login' });
    } catch (error) {
      console.error('[COMPANY-AUTH] Google login error:', error);
      next(error);
    }
  }
}

module.exports = CompanyAuthController;
