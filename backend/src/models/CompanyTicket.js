const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class CompanyTicket {
  static async findById(id) {
    return db('company_tickets').where({ id }).first();
  }

  static async findByCompanyId(companyId) {
    return db('company_tickets').where({ company_id: companyId }).orderBy('created_at', 'desc');
  }

  static async findPending() {
    return db('company_tickets').where({ ticket_status: 'PENDING' }).orderBy('created_at', 'desc');
  }

  static async findAll() {
    return db('company_tickets').orderBy('created_at', 'desc');
  }

  static async findByStatus(status) {
    return db('company_tickets').where({ ticket_status: status }).orderBy('created_at', 'desc');
  }

  static async create(data) {
    const id = uuidv4();
    await db('company_tickets').insert({
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async update(id, data) {
    await db('company_tickets').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async approve(id, adminId, approvedAt = null) {
    return this.update(id, {
      ticket_status: 'APPROVED',
      approved_by_admin_id: adminId,
      updated_at: approvedAt || new Date(),
    });
  }

  static async reject(id, reason = '') {
    return this.update(id, {
      ticket_status: 'REJECTED',
      rejected_reason: reason,
    });
  }

  static async delete(id) {
    return db('company_tickets').where({ id }).del();
  }
}

module.exports = CompanyTicket;
