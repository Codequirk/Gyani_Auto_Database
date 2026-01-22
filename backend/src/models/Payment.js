const PaymentSchema = require('./schemas/PaymentSchema');
const { v4: uuidv4 } = require('uuid');

class Payment {
  static async findById(id) {
    const payment = await PaymentSchema.findOne({ id });
    return payment ? payment.toObject() : null;
  }

  static async findByTicketId(ticketId) {
    const payments = await PaymentSchema.find({ ticket_id: ticketId }).sort({ created_at: -1 });
    return payments.map(p => p.toObject());
  }

  static async findByAutoId(autoId) {
    const payments = await PaymentSchema.find({ auto_id: autoId }).sort({ created_at: -1 });
    return payments.map(p => p.toObject());
  }

  static async findByCompanyId(companyId) {
    const payments = await PaymentSchema.find({ company_id: companyId }).sort({ created_at: -1 });
    return payments.map(p => p.toObject());
  }

  static async findByStatus(status) {
    const payments = await PaymentSchema.find({ payment_status: status }).sort({ created_at: -1 });
    return payments.map(p => p.toObject());
  }

  static async findAll() {
    const payments = await PaymentSchema.find({}).sort({ created_at: -1 });
    return payments.map(p => p.toObject());
  }

  static async create(data) {
    const id = uuidv4();
    
    // Calculate total cost if not provided
    const totalCost = data.total_cost || (data.cost_per_day * data.total_days);
    
    const payment = new PaymentSchema({
      _id: id,
      id,
      ...data,
      total_cost: totalCost,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await payment.save();
    return this.findById(id);
  }

  static async update(id, data) {
    const existingPayment = await PaymentSchema.findOne({ id });
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    // Recalculate total cost if cost_per_day or total_days changed
    if (data.cost_per_day !== undefined || data.total_days !== undefined) {
      const costPerDay = data.cost_per_day !== undefined ? data.cost_per_day : existingPayment.cost_per_day;
      const totalDays = data.total_days !== undefined ? data.total_days : existingPayment.total_days;
      data.total_cost = costPerDay * totalDays;
    }

    await PaymentSchema.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return this.findById(id);
  }

  static async updateStatus(id, status) {
    return this.update(id, { payment_status: status });
  }

  static async delete(id) {
    const result = await PaymentSchema.findOneAndDelete({ id });
    return result;
  }

  static async deleteByTicketId(ticketId) {
    const result = await PaymentSchema.deleteMany({ ticket_id: ticketId });
    return result;
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
