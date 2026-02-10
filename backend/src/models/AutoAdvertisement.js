const db = require('./db');

class AutoAdvertisement {
  static async create(autoId, companyId, imagePath, imageFilename) {
    const result = await db('auto_advertisements').insert({
      auto_id: autoId,
      company_id: companyId,
      image_path: imagePath,
      image_filename: imageFilename,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    return result[0] || null;
  }

  static async findByAutoAndCompany(autoId, companyId) {
    const ad = await db('auto_advertisements')
      .where({ auto_id: autoId, company_id: companyId, deleted_at: null })
      .first();
    return ad || null;
  }

  static async findByAuto(autoId) {
    const ads = await db('auto_advertisements')
      .where({ auto_id: autoId, deleted_at: null });
    return ads || [];
  }

  static async deleteByAutoAndCompany(autoId, companyId) {
    const result = await db('auto_advertisements')
      .where({ auto_id: autoId, company_id: companyId })
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    return result[0] || null;
  }

  static async deleteByAuto(autoId) {
    const result = await db('auto_advertisements')
      .where({ auto_id: autoId })
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    return result;
  }

  static async getByAutoId(autoId) {
    const ads = await db('auto_advertisements')
      .where({ auto_id: autoId, deleted_at: null })
      .orderBy('created_at', 'desc');
    return ads;
  }
}

module.exports = AutoAdvertisement;
