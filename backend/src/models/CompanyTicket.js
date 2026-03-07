const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class CompanyTicket {
  static async findById(id) {
    return db('company_tickets').where({ id }).first();
  }

  static async findByCompanyId(companyId, options = {}) {
    let query = db('company_tickets').where({ company_id: companyId });

    // Exclude dismissed rejected tickets unless explicitly requested
    if (!options.includeDismissed) {
      query = query.where((builder) => {
        builder
          .where({ 'company_tickets.ticket_status': 'PENDING' })
          .orWhere({ 'company_tickets.ticket_status': 'APPROVED' })
          .orWhere(function () {
            this.where({ 'company_tickets.ticket_status': 'REJECTED' }).where({ 'company_tickets.dismissed_by_company': false });
          });
      });
    }

    return query.orderBy('created_at', 'desc');
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
      dismissed_by_company: false,
    });
  }

  /**
   * Dismiss a rejected ticket notification by company
   * Only works for REJECTED tickets that haven't been dismissed yet
   */
  static async dismiss(id) {
    const ticket = await this.findById(id);
    if (!ticket || ticket.ticket_status !== 'REJECTED') {
      throw new Error('Only rejected tickets can be dismissed');
    }
    if (ticket.dismissed_by_company) {
      throw new Error('Ticket already dismissed');
    }
    return this.update(id, {
      dismissed_by_company: true,
    });
  }

  /**
   * Get pending tickets for a specific company
   * Excludes dismissed rejected tickets
   */
  static async findPendingByCompanyId(companyId) {
    return db('company_tickets')
      .where({ company_id: companyId, ticket_status: 'PENDING' })
      .orderBy('created_at', 'desc');
  }

  /**
   * Get active rejected tickets (not yet dismissed) for a company
   */
  static async findRejectedByCompanyId(companyId) {
    return db('company_tickets')
      .where({ company_id: companyId, ticket_status: 'REJECTED', dismissed_by_company: false })
      .orderBy('created_at', 'desc');
  }

  /**
   * Get approved tickets for a company
   */
  static async findApprovedByCompanyId(companyId) {
    return db('company_tickets')
      .where({ company_id: companyId, ticket_status: 'APPROVED' })
      .orderBy('created_at', 'desc');
  }

  static async delete(id) {
    return db('company_tickets').where({ id }).del();
  }
}

module.exports = CompanyTicket;
module.exports = CompanyTicket;
