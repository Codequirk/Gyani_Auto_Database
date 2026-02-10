/**
 * AdvertisementImage Model
 * 
 * Manages advertisement images for ACTIVE autos
 * - Stores images for 7 days, then auto-deletes
 * - One image per auto at a time
 * - PNG only
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class AdvertisementImage {
  /**
   * Create a new advertisement image record
   * @param {string} autoId - Auto ID
   * @param {string} filename - Filename of the stored image
   * @returns {Object} Created record
   */
  static async create(autoId, filename) {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const rows = await db('advertisement_images').insert({
      id,
      auto_id: autoId,
      filename,
      uploaded_at: now,
      expires_at: expiresAt,
      created_at: now
    }).returning('*');
    
    return rows[0] || null;
  }

  /**
   * Find image by auto ID
   * @param {string} autoId - Auto ID
   * @returns {Object|null} Advertisement image record or null
   */
  static async findByAutoId(autoId) {
    const image = await db('advertisement_images')
      .where({ auto_id: autoId })
      .where('expires_at', '>', new Date())
      .orderBy('uploaded_at', 'desc')
      .first();
    
    return image || null;
  }

  /**
   * Delete image by auto ID
   * @param {string} autoId - Auto ID
   * @returns {boolean} Success status
   */
  static async deleteByAutoId(autoId) {
    const result = await db('advertisement_images')
      .where({ auto_id: autoId })
      .del();
    
    return result > 0;
  }

  /**
   * Find all expired images
   * @returns {Array} List of expired advertisement images
   */
  static async findExpired() {
    const images = await db('advertisement_images')
      .where('expires_at', '<=', new Date());
    
    return images || [];
  }

  /**
   * Delete expired images (cleanup)
   * @returns {number} Number of deleted records
   */
  static async deleteExpired() {
    const count = await db('advertisement_images')
      .where('expires_at', '<=', new Date())
      .del();
    
    return count;
  }

  /**
   * Get all advertisement images for a list of auto IDs
   * @param {Array} autoIds - List of auto IDs
   * @returns {Array} Advertisement images for these autos
   */
  static async findByAutoIds(autoIds) {
    if (!autoIds || autoIds.length === 0) return [];

    const images = await db('advertisement_images')
      .whereIn('auto_id', autoIds)
      .where('expires_at', '>', new Date());
    
    return images || [];
  }
}

module.exports = AdvertisementImage;
