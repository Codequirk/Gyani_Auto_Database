/**
 * Passport Configuration
 * Configures both Local and Google OAuth strategies
 * 
 * Local Strategy: email + password authentication
 * Google Strategy: OAuth 2.0 authentication via Google
 * 
 * Usage: Imported and initialized in backend/src/index.js
 */

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const Company = require('../models/Company');

/**
 * ============================================================================
 * Local Strategy (Email + Password)
 * ============================================================================
 * Verifies email and password for manual login
 */
passport.use(
  'local',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        // Find company by email
        const company = await Company.findByEmail(email);
        
        if (!company) {
          return done(null, false, { message: 'Email not found' });
        }

        // Only local auth companies can login with password
        if (company.auth_provider !== 'local') {
          return done(null, false, {
            message: `This account uses ${company.auth_provider} authentication. Please login via ${company.auth_provider}.`,
          });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, company.password_hash);
        if (!isPasswordValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        // Check if profile is complete
        if (!company.is_profile_complete) {
          return done(null, false, {
            message: 'Please complete your profile before logging in',
            company,
            redirectTo: '/complete-profile',
          });
        }

        return done(null, company);
      } catch (error) {
        console.error('❌ Local strategy error:', error.message);
        return done(error);
      }
    }
  )
);

/**
 * ============================================================================
 * Google OAuth Strategy
 * ============================================================================
 * Handles authentication via Google OAuth 2.0
 * Creates or updates user on successful authentication
 */
passport.use(
  'google',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/company-auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user data from Google profile
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const displayName = profile.displayName;

        // Check if user already exists by google_id
        let company = await Company.findByGoogleId(googleId);

        if (company) {
          // User exists, update last login
          await company.update({
            updated_at: new Date(),
          });
          return done(null, company);
        }

        // Check if email already exists (user registered locally)
        company = await Company.findByEmail(email);

        if (company && company.auth_provider === 'local') {
          // Existing local auth user - cannot auto-link for security
          return done(null, false, {
            message: 'This email is already registered with password authentication. Please login with your password.',
          });
        }

        // Create new user
        company = await Company.create({
          email,
          google_id: googleId,
          contact_person: displayName,
          auth_provider: 'google',
          is_profile_complete: false,
        });

        return done(null, company);
      } catch (error) {
        console.error('❌ Google strategy error:', error.message);
        return done(error);
      }
    }
  )
);

/**
 * ============================================================================
 * Serialization (for sessions, not used with JWT)
 * Kept for compatibility with Passport
 * ============================================================================
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
