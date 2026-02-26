const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class Payment {
  static async findById(id) {
    return db('payments').where({ id }).first();
  }

  static async findByTicketId(ticketId) {
    return db('payments')
      .leftJoin('autos', 'payments.auto_id', 'autos.id')
      .leftJoin('areas', 'autos.area_id', 'areas.id')
      .where({ 'payments.ticket_id': ticketId })
      .select(
        'payments.*',
        db.raw('autos.auto_no as auto_registration_number'),
        db.raw('autos.owner_name as auto_owner_name'),
        db.raw('autos.status as auto_status'),
        db.raw('areas.name as area_name')
      )
      .orderBy('payments.created_at', 'desc');
  }

  static async findByAutoId(autoId) {
    return db('payments').where({ auto_id: autoId }).orderBy('created_at', 'desc');
  }

  static async findByCompanyId(companyId) {
    return db('payments').where({ company_id: companyId }).orderBy('created_at', 'desc');
  }

  static async findByStatus(status) {
    return db('payments').where({ payment_status: status }).orderBy('created_at', 'desc');
  }

  static async findAll() {
    return db('payments').orderBy('created_at', 'desc');
  }

  static async create(data) {
    const id = uuidv4();
    
    // Calculate total cost if not provided
    const totalCost = data.total_cost || (data.cost_per_day * data.total_days);
    
    await db('payments').insert({
      id,
      ...data,
      total_cost: totalCost,
      assigned_time: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async update(id, data) {
    const existingPayment = await this.findById(id);
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    // Recalculate total cost if cost_per_day or total_days changed
    if (data.cost_per_day !== undefined || data.total_days !== undefined) {
      const costPerDay = data.cost_per_day !== undefined ? data.cost_per_day : existingPayment.cost_per_day;
      const totalDays = data.total_days !== undefined ? data.total_days : existingPayment.total_days;
      data.total_cost = costPerDay * totalDays;
    }

    await db('payments').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async updateStatus(id, status) {
    return this.update(id, { payment_status: status });
  }

  static async delete(id) {
    return db('payments').where({ id }).del();
  }

  static async deleteByTicketId(ticketId) {
    return db('payments').where({ ticket_id: ticketId }).del();
  }

  static async getTotalCostByTicket(ticketId) {
    const payments = await this.findByTicketId(ticketId);
    const total = payments.reduce((sum, payment) => sum + (payment.total_cost || 0), 0);
    return total;
  }

  static async getTicketPaymentsSummary(ticketId) {
    const payments = await this.findByTicketId(ticketId);
    const summary = {
      total_payments: payments.length,
      total_cost: payments.reduce((sum, p) => sum + (p.total_cost || 0), 0),
      pending_count: payments.filter(p => p.payment_status === 'PENDING').length,
      approved_count: payments.filter(p => p.payment_status === 'APPROVED').length,
      paid_count: payments.filter(p => p.payment_status === 'PAID').length,
      cancelled_count: payments.filter(p => p.payment_status === 'CANCELLED').length,
      payments: payments,
    };
    return summary;
  }
}

module.exports = Payment;
