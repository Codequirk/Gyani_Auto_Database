/**
 * OTP Utilities
 * Generates, stores, and validates OTPs
 */

const crypto = require('crypto');
const db = require('../models/db');

class OTPUtils {
  /**
   * Generate a 6-digit OTP
   */
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create and store OTP in database with expiry
   * @param {string} email - User email
   * @param {number} expiryMinutes - OTP expiry time in minutes (default: 5)
   * @returns {string} - Generated OTP
   */
  static async createOTP(email, expiryMinutes = 5) {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    console.log(`[OTP] Creating OTP for ${email}, expires at ${expiresAt}`);

    await db('company_otps').insert({
      email,
      otp,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    return otp;
  }

  /**
   * Verify OTP
   * @param {string} email - User email
   * @param {string} otp - OTP to verify
   * @returns {object} - { valid: boolean, error: string | null }
   */
  static async verifyOTP(email, otp) {
    try {
      // Find the most recent OTP for this email
      const otpRecord = await db('company_otps')
        .where({ email, otp })
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .first();

      if (!otpRecord) {
        console.log(`[OTP] Invalid or expired OTP for ${email}`);
        return { valid: false, error: 'Invalid or expired OTP' };
      }

      console.log(`[OTP] OTP verified for ${email}`);

      // Delete the OTP after successful verification
      await db('company_otps').where({ id: otpRecord.id }).delete();

      return { valid: true, error: null };
    } catch (error) {
      console.error('[OTP] Verification error:', error);
      return { valid: false, error: 'OTP verification failed' };
    }
  }

  /**
   * Clean up expired OTPs (call periodically)
   */
  static async cleanupExpiredOTPs() {
    try {
      const deleted = await db('company_otps')
        .where('expires_at', '<', new Date())
        .delete();

      if (deleted > 0) {
        console.log(`[OTP] Cleaned up ${deleted} expired OTPs`);
      }
    } catch (error) {
      console.error('[OTP] Cleanup error:', error);
    }
  }

  /**
   * Delete all OTPs for an email (useful before creating new one)
   */
  static async deleteOTPsForEmail(email) {
    try {
      await db('company_otps').where({ email }).delete();
      console.log(`[OTP] Deleted all OTPs for ${email}`);
    } catch (error) {
      console.error('[OTP] Delete error:', error);
    }
  }
}

module.exports = OTPUtils;
