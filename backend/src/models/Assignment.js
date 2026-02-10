const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { isCompletedAssignment, shouldDeleteAssignment } = require('../utils/statusCalculator');

class Assignment {
  static async findById(id) {
    return db('assignments').where({ id }).first();
  }

  static async findByAutoAndCompany(autoId, companyId) {
    return db('assignments').where({ auto_id: autoId, company_id: companyId, status: 'ACTIVE' }).first();
  }

  static async findActive() {
    return db('assignments').where({ status: 'ACTIVE' }).orderBy('start_date', 'desc');
  }

  static async findAll() {
    // Return all non-deleted assignments
    return db('assignments')
      .whereIn('auto_id', 
        db('autos').select('id').where({ deleted_at: null })
      )
      .orderBy('start_date', 'desc');
  }

  static async findByAutoId(autoId) {
    // Only return assignments where the auto still exists (not soft-deleted)
    return db('assignments')
      .where({ auto_id: autoId })
      .whereIn('auto_id',
        db('autos').select('id').where({ deleted_at: null })
      )
      .orderBy('start_date', 'desc');
  }

  static async findByCompanyId(companyId) {
    // Only return assignments where the auto still exists (not soft-deleted)
    return db('assignments')
      .where({ company_id: companyId })
      .whereIn('auto_id', 
        db('autos').select('id').where({ deleted_at: null })
      )
      .orderBy('start_date', 'desc');
  }

  static async findCurrentActiveAssignment(autoId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return db('assignments')
      .where({ auto_id: autoId })
      .whereIn('status', ['ACTIVE', 'PREBOOKED'])
      .where('start_date', '<=', today)
      .where('end_date', '>=', today)
      .orderBy('start_date', 'desc')
      .first();
  }

  static async create(data) {
    const id = uuidv4();
    await db('assignments').insert({
      id,
      ...data,
      assigned_time: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async update(id, data) {
    await db('assignments').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async updateStatus(id, status) {
    return this.update(id, { status });
  }

  static async createBulk(assignments) {
    if (!assignments.length) return [];
    
    const results = [];
    for (const assignment of assignments) {
      const id = uuidv4();
      await db('assignments').insert({
        id,
        ...assignment,
        assigned_time: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      results.push(await this.findById(id));
    }
    
    return results;
  }

  static async deleteByAutoId(autoId) {
    return db('assignments').where({ auto_id: autoId }).del();
  }

  static async deleteByCompanyId(companyId) {
    return db('assignments').where({ company_id: companyId }).del();
  }

  static async deleteById(id) {
    return db('assignments').where({ id }).del();
  }

  /**
   * Find completed assignments (end_date < today)
   * @param {string} autoId - Optional: filter by auto_id
   * @returns {Array} - Completed assignments
   */
  static async findCompleted(autoId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = db('assignments').where('end_date', '<', today);
    if (autoId) {
      query = query.where({ auto_id: autoId });
    }
    return query.orderBy('end_date', 'desc');
  }

  /**
   * Find assignments eligible for deletion (30 days after end_date)
   * @returns {Array} - Assignments to delete
   */
  static async findEligibleForDeletion() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Assignments where end_date + 30 days <= today
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return db('assignments')
      .where('end_date', '<=', thirtyDaysAgo)
      .orderBy('end_date', 'asc');
  }

  /**
   * Delete old completed assignments (30 days after completion)
   * @returns {number} - Count of deleted assignments
   */
  static async deleteOldCompleted() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Assignments where end_date + 30 days <= today
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return db('assignments')
      .where('end_date', '<=', thirtyDaysAgo)
      .del();
  }
}

module.exports = Assignment;