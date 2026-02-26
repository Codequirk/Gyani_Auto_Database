/**
 * Password Utilities
 * Handles password hashing, verification, and generation
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');

class PasswordUtils {
  /**
   * Hash a password with bcrypt
   * @param {string} password - Plain text password
   * @returns {string} - Hashed password
   */
  static async hashPassword(password) {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error('[PASSWORD] Error hashing password:', error);
      throw error;
    }
  }

  /**
   * Compare plain password with hashed password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {boolean} - true if match, false otherwise
   */
  static async comparePassword(plainPassword, hashedPassword) {
    try {
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      return isMatch;
    } catch (error) {
      console.error('[PASSWORD] Error comparing passwords:', error);
      throw error;
    }
  }

  /**
   * Validate password strength
   * Requirements: min 8 chars, at least one uppercase, one lowercase, one number, one special char
   * @param {string} password - Password to validate
   * @returns {object} - { valid: boolean, errors: string[] }
   */
  static validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random token for password reset
   * @returns {string} - 32-character hex token
   */
  static generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash reset token for storage (don't store plain tokens)
   * @param {string} token - Plain text token
   * @returns {string} - Hashed token
   */
  static hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = PasswordUtils;
