/**
 * Email Utilities
 * Handles email sending via Gmail SMTP using Nodemailer
 */

const nodemailer = require('nodemailer');

class EmailUtils {
  static transporter = null;

  /**
   * Initialize email transporter (called once at startup)
   */
  static initializeTransporter() {
    if (this.transporter) return;

    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASSWORD?.trim();

    // Check if credentials are configured
    if (!emailUser || !emailPass) {
      console.error('[EMAIL] ❌ CREDENTIALS MISSING!');
      console.error('[EMAIL] EMAIL_USER:', emailUser ? 'SET' : '❌ NOT SET');
      console.error('[EMAIL] EMAIL_PASSWORD:', emailPass ? 'SET' : '❌ NOT SET');
      console.error('[EMAIL] Please configure EMAIL_USER and EMAIL_PASSWORD in .env');
      return;
    }

    // Check if using placeholder values
    if (emailUser.includes('your-gmail') || emailPass.includes('your-app-password')) {
      console.warn('[EMAIL] ⚠️  WARNING: Using placeholder credentials!');
      console.warn('[EMAIL] Please update .env with real Gmail credentials');
      console.warn('[EMAIL] Get App Password from: https://myaccount.google.com/apppasswords');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('[EMAIL] ❌ SMTP Connection failed:', error.message);
        } else {
          console.log('[EMAIL] ✓ Transporter initialized with Gmail SMTP');
          console.log('[EMAIL] ✓ SMTP connection verified successfully');
        }
      });
    } catch (error) {
      console.error('[EMAIL] ❌ Failed to create transporter:', error.message);
    }
  }

  /**
   * Send OTP email
   * @param {string} email - Recipient email
   * @param {string} otp - 6-digit OTP
   */
  static async sendOTPEmail(email, otp) {
    try {
      if (!this.transporter) this.initializeTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification - Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
              <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
              
              <p style="color: #666; font-size: 16px;">Hello,</p>
              <p style="color: #666; font-size: 16px;">
                You requested to verify your email for Gyani Auto Database Company Portal.
              </p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <p style="color: #999; font-size: 14px; margin: 0;">Your verification code is:</p>
                <p style="color: #007bff; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 15px 0;">
                  ${otp}
                </p>
                <p style="color: #999; font-size: 12px; margin: 0;">This code expires in 5 minutes</p>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If you didn't request this verification, please ignore this email.
              </p>
              
              <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; text-align: center;">
                <p style="color: #999; font-size: 12px;">
                  © 2026 Gyani Auto Database. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      if (!this.transporter) {
        console.warn('[EMAIL] ⚠️  Email credentials not configured');
        console.warn('[EMAIL] 🔐 [DEV] OTP for ' + email + ': ' + otp);
        throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env');
      }

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`[EMAIL] ✓ OTP email sent to ${email}`);
      console.log('[EMAIL] Message ID:', info.messageId);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('[EMAIL] ❌ Error sending OTP:', error.message);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Reset token/link
   */
  static async sendPasswordResetEmail(email, resetToken) {
    try {
      if (!this.transporter) this.initializeTransporter();

      const resetLink = `${process.env.COMPANY_PORTAL_URL}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request - Company Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
              
              <p style="color: #666; font-size: 16px;">Hello,</p>
              <p style="color: #666; font-size: 16px;">
                You requested to reset your password for Gyani Auto Database Company Portal.
              </p>
              
              <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Or copy this link: <br/>
                <span style="color: #007bff; word-break: break-all; font-size: 12px;">${resetLink}</span>
              </p>
              
              <p style="color: #999; font-size: 12px;">
                This link expires in 1 hour. If you didn't request this reset, please ignore this email.
              </p>
              
              <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; text-align: center;">
                <p style="color: #999; font-size: 12px;">
                  © 2026 Gyani Auto Database. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Reset email sent to ${email}:`, info.response);
      return { success: true, message: 'Reset link sent successfully' };
    } catch (error) {
      console.error('[EMAIL] Error sending reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email after registration
   */
  static async sendWelcomeEmail(email, companyName) {
    try {
      if (!this.transporter) this.initializeTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to Gyani Auto Database Company Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
              <h2 style="color: #333; margin-bottom: 20px;">Welcome, ${companyName}! 🎉</h2>
              
              <p style="color: #666; font-size: 16px;">Hello,</p>
              <p style="color: #666; font-size: 16px;">
                Your account has been successfully created on Gyani Auto Database Company Portal.
              </p>
              
              <p style="color: #666; font-size: 16px;">
                You can now access your dashboard to view and manage your assignments.
              </p>
              
              <div style="margin: 30px 0;">
                <a href="${process.env.COMPANY_PORTAL_URL}/dashboard" style="background-color: #28a745; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: bold;">
                  Go to Dashboard
                </a>
              </div>
              
              <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px;">
                <h3 style="color: #333; font-size: 14px;">Quick Start:</h3>
                <ul style="color: #666; font-size: 14px; line-height: 1.8;">
                  <li>View your assigned vehicles</li>
                  <li>Check upcoming assignments</li>
                  <li>Upload advertisement images</li>
                  <li>Manage your company profile</li>
                </ul>
              </div>
              
              <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; text-align: center;">
                <p style="color: #999; font-size: 12px;">
                  © 2026 Gyani Auto Database. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Welcome email sent to ${email}:`, info.response);
      return { success: true, message: 'Welcome email sent' };
    } catch (error) {
      console.error('[EMAIL] Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailUtils;
