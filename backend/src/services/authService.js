/**
 * Authentication Service
 * Business logic for authentication operations
 * 
 * Handles:
 * - JWT token generation and verification
 * - User creation with validation
 * - Profile completion
 * - Password hashing and verification
 * - User authentication checks
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'; // 24 hours

class AuthService {
  /**
   * Generate JWT token for authenticated user
   * @param {Object} user - User object with id, email, etc.
   * @returns {string} JWT token
   */
  static generateToken(user) {
    try {
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          auth_provider: user.auth_provider,
          type: 'company', // For distinguishing from admin tokens
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      return token;
    } catch (error) {
      console.error('❌ Token generation error:', error.message);
      throw new Error('Failed to generate token');
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {string} Hashed password
   */
  static async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('❌ Password hash error:', error.message);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {boolean} Whether password matches hash
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('❌ Password verification error:', error.message);
      return false;
    }
  }

  /**
   * Register new user with email and password
   * @param {Object} data - User registration data
   * @param {string} data.email - User email
   * @param {string} data.password - Plain text password
   * @param {string} data.contact_person - Contact person name
   * @param {string} data.company_name - Company name
   * @param {string} data.phone_number - Phone number
   * @returns {Object} Created user object
   * @throws {Error} If registration fails
   */
  static async registerUser(data) {
    try {
      const User = require('../models/User');

      // Validate required fields
      if (!data.email || !data.password) {
        throw new Error('Email and password are required');
      }

      // Check if email already exists
      const existingUser = await User.findByEmail(data.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const user = await User.create({
        id: uuidv4(),
        email: data.email,
        password_hash: passwordHash,
        contact_person: data.contact_person || 'User',
        company_name: data.company_name || null,
        phone_number: data.phone_number || null,
        auth_provider: 'local',
        is_profile_complete: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return user;
    } catch (error) {
      console.error('❌ User registration error:', error.message);
      throw error;
    }
  }

  /**
   * Complete user profile after initial registration
   * @param {string} userId - User ID
   * @param {Object} data - Profile completion data
   * @param {string} data.company_name - Company name
   * @param {string} data.phone_number - Phone number
   * @param {string} data.contact_person - Contact person (optional)
   * @returns {Object} Updated user object
   * @throws {Error} If update fails
   */
  static async completeProfile(userId, data) {
    try {
      const User = require('../models/User');

      // Validate required fields
      if (!data.company_name || !data.phone_number) {
        throw new Error('Company name and phone number are required');
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only incomplete profiles can be completed
      if (user.is_profile_complete) {
        throw new Error('Profile already complete');
      }

      // Update profile
      const updatedUser = await User.update(userId, {
        company_name: data.company_name,
        phone_number: data.phone_number,
        ...(data.contact_person && { contact_person: data.contact_person }),
        is_profile_complete: true,
        updated_at: new Date(),
      });

      return updatedUser;
    } catch (error) {
      console.error('❌ Profile completion error:', error.message);
      throw error;
    }
  }

  /**
   * Get user data with masked sensitive fields
   * @param {Object} user - User object from database
   * @returns {Object} Safe user object without password
   */
  static getSafeUserData(user) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Whether email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with message
   */
  static validatePassword(password) {
    if (!password || password.length < 8) {
      return {
        valid: false,
        message: 'Password must be at least 8 characters',
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter',
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one lowercase letter',
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one number',
      };
    }

    return { valid: true };
  }
}

module.exports = AuthService;
