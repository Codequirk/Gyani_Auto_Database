const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { calculateAutoStatus } = require('../utils/statusCalculator');

class Auto {
  static async findById(id) {
    const auto = await db('autos').where({ id, deleted_at: null }).first();
    if (!auto) return null;
    
    const area = await db('areas').where({ id: auto.area_id }).first();
    if (area) {
      auto.area_name = area.name;
    }
    return auto;
  }

  static async findByAutoNo(autoNo) {
    const auto = await db('autos').where({ auto_no: autoNo, deleted_at: null }).first();
    if (!auto) return null;
    
    const area = await db('areas').where({ id: auto.area_id }).first();
    if (area) {
      auto.area_name = area.name;
    }
    return auto;
  }

  static async findAll(filters = {}) {
    let query = db('autos').where({ deleted_at: null });

    if (filters.area_id) {
      query = query.where({ area_id: filters.area_id });
    }

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    let autos = await query.orderBy('created_at', 'desc');
    
    for (let i = 0; i < autos.length; i++) {
      const area = await db('areas').where({ id: autos[i].area_id }).first();
      if (area) {
        autos[i].area_name = area.name;
      }
      autos[i] = autos[i];
    }
    
    return autos;
  }

  static async create(data) {
    const id = uuidv4();
    await db('autos').insert({
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
      last_updated_at: new Date(),
    });
    
    return this.findById(id);
  }

  static async update(id, data) {
    await db('autos').where({ id }).update({
      ...data,
      updated_at: new Date(),
      last_updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async updateStatus(id, status) {
    return this.update(id, { status });
  }

  static async softDelete(id) {
    await db('autos').where({ id }).update({
      deleted_at: new Date(),
      updated_at: new Date(),
    });
  }

  static async getWithAssignments(id) {
    const auto = await this.findById(id);
    if (!auto) return null;

    const assignments = await db('assignments').where({ auto_id: id }).orderBy('start_date', 'desc');

    // Enrich assignments with company_name
    const Company = require('./Company');
    const assignmentObjs = await Promise.all(
      assignments.map(async (a) => {
        if (a.company_id) {
          const company = await Company.findById(a.company_id);
          a.company_name = company?.name || 'Unknown';
        }
        return a;
      })
    );

    return { ...auto, assignments: assignmentObjs };
  }

  static async getIdleAutos() {
    let autos = await db('autos').where({ status: 'IDLE', deleted_at: null }).orderBy('last_updated_at', 'asc');
    
    for (let i = 0; i < autos.length; i++) {
      const area = await db('areas').where({ id: autos[i].area_id }).first();
      if (area) autos[i].area_name = area.name;
    }
    
    return autos;
  }

  static async getPriorityAutos(daysThreshold = 2) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const assignments = await db('assignments')
      .where('end_date', '<=', thresholdDate)
      .where('end_date', '>=', today)
      .whereIn('status', ['ACTIVE', 'PREBOOKED']);

    const autosMap = new Map();
    for (let assignment of assignments) {
      const auto = await db('autos').where({ id: assignment.auto_id, deleted_at: null }).first();
      if (auto) {
        const area = await db('areas').where({ id: auto.area_id }).first();
        if (area) auto.area_name = area.name;
        autosMap.set(auto.id, auto);
      }
    }

    return Array.from(autosMap.values());
  }

  static async getPreBookedCount() {
    const result = await db('autos').where({ status: 'PREBOOKED', deleted_at: null }).count('id as count').first();
    return result?.count || 0;
  }

  static async getActiveCount() {
    const result = await db('autos').where({ status: 'ACTIVE', deleted_at: null }).count('id as count').first();
    return result?.count || 0;
  }

  static async getIdleCount() {
    const result = await db('autos').where({ status: 'IDLE', deleted_at: null }).count('id as count').first();
    return result?.count || 0;
  }

  /**
   * Recalculate and update auto status based on its current assignments
   * @param {string} autoId - Auto ID
   * @returns {Object} - Updated auto object
   */
  static async recalculateAndUpdateStatus(autoId) {
    const auto = await this.findById(autoId);
    if (!auto) return null;

    // Get all assignments for this auto
    const assignments = await db('assignments').where({ auto_id: autoId });

    // Calculate the correct status
    const newStatus = calculateAutoStatus(assignments);

    // Only update if status changed
    if (auto.status !== newStatus) {
      await this.updateStatus(autoId, newStatus);
      return this.findById(autoId);
    }

    return auto;
  }}

module.exports = Auto;