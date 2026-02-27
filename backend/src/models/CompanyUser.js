/**
 * CompanyUser Model
 * Handles company user data access
 * Uses class-based pattern with static methods
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class CompanyUser {
  /**
   * Find user by ID
   */
  static async findById(id) {
    const user = await db('company_users')
      .where({ id, deleted_at: null })
      .first();
    
    if (!user) return null;
    
    // Remove sensitive data
    delete user.password;
    return user;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const user = await db('company_users')
      .where(db.raw('LOWER(email) = ?', [email.toLowerCase()]))
      .where({ deleted_at: null })
      .first();
    
    return user;
  }

  /**
   * Find user by Google ID
   */
  static async findByGoogleId(googleId) {
    const user = await db('company_users')
      .where({ google_id: googleId, deleted_at: null })
      .first();
    
    if (!user) return null;
    
    delete user.password;
    return user;
  }

  /**
   * Create new user
   */
  static async create(data) {
    console.log('[COMPANY-USER-MODEL] Creating new user with data:', {
      email: data.email,
      has_password: !!data.password,
      company_name: data.company_name,
      phone_number: data.phone_number,
      company_person: data.company_person,
      is_verified: data.is_verified,
    });

    const id = uuidv4();
    
    try {
      await db('company_users').insert({
        id,
        email: data.email.toLowerCase(),
        password: data.password || null,
        google_id: data.google_id || null,
        company_name: data.company_name || null,
        phone_number: data.phone_number || null,
        company_person: data.company_person || null,
        is_verified: data.is_verified || false,
        verified_at: data.is_verified ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log('[COMPANY-USER-MODEL] ✓ User created with ID:', id);
    } catch (error) {
      console.error('[COMPANY-USER-MODEL] ❌ Error creating user:', error.message);
      throw error;
    }

    return this.findById(id);
  }

  /**
   * Update user
   */
  static async update(id, data) {
    await db('company_users')
      .where({ id })
      .update({
        ...data,
        updated_at: new Date(),
      });

    return this.findById(id);
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id) {
    await db('company_users')
      .where({ id })
      .update({
        last_login: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * Verify user email
   */
  static async verifyEmail(id) {
    await db('company_users')
      .where({ id })
      .update({
        is_verified: true,
        verified_at: new Date(),
        updated_at: new Date(),
      });

    return this.findById(id);
  }

  /**
   * Check if email exists
   */
  static async emailExists(email) {
    const user = await db('company_users')
      .where(db.raw('LOWER(email) = ?', [email.toLowerCase()]))
      .where({ deleted_at: null })
      .first();

    return !!user;
  }

  /**
   * Get user with password (for authentication)
   */
  static async findByEmailWithPassword(email) {
    console.log('[COMPANY-USER-MODEL] findByEmailWithPassword called with email:', email);
    
    const user = await db('company_users')
      .where(db.raw('LOWER(email) = ?', [email.toLowerCase()]))
      .where({ deleted_at: null })
      .first();

    if (user) {
      console.log('[COMPANY-USER-MODEL] ✓ Found user:', {
        id: user.id,
        email: user.email,
        is_verified: user.is_verified,
        has_password: !!user.password,
      });
    } else {
      console.log('[COMPANY-USER-MODEL] ⚠️ No user found for email:', email);
      console.log('[COMPANY-USER-MODEL] Debugging: Checking all company_users in DB');
      const allUsers = await db('company_users').where({ deleted_at: null });
      console.log('[COMPANY-USER-MODEL] Total users in DB:', allUsers.length);
      if (allUsers.length > 0) {
        console.log('[COMPANY-USER-MODEL] Sample users:', allUsers.slice(0, 3).map(u => ({ id: u.id, email: u.email })));
      }
    }

    return user; // Keep password for comparison
  }

  /**
   * Soft delete user
   */
  static async softDelete(id) {
    await db('company_users')
      .where({ id })
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * Check if profile is complete
   */
  static async isProfileComplete(id) {
    const user = await db('company_users')
      .where({ id, deleted_at: null })
      .first();

    if (!user) return false;

    return !!(
      user.company_name &&
      user.phone_number &&
      user.company_person &&
      user.is_verified
    );
  }
}

module.exports = CompanyUser;
