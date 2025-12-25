const CompanyTicketSchema = require('./schemas/CompanyTicketSchema');
const { v4: uuidv4 } = require('uuid');

class CompanyTicket {
  static async findById(id) {
    const ticket = await CompanyTicketSchema.findOne({ id });
    return ticket ? ticket.toObject() : null;
  }

  static async findByCompanyId(companyId) {
    const tickets = await CompanyTicketSchema.find({ company_id: companyId }).sort({ created_at: -1 });
    return tickets.map(t => t.toObject());
  }

  static async findPending() {
    const tickets = await CompanyTicketSchema.find({ ticket_status: 'PENDING' }).sort({ created_at: -1 });
    return tickets.map(t => t.toObject());
  }

  static async findAll() {
    const tickets = await CompanyTicketSchema.find({}).sort({ created_at: -1 });
    return tickets.map(t => t.toObject());
  }

  static async findByStatus(status) {
    const tickets = await CompanyTicketSchema.find({ ticket_status: status }).sort({ created_at: -1 });
    return tickets.map(t => t.toObject());
  }

  static async create(data) {
    const id = uuidv4();
    const ticket = new CompanyTicketSchema({
      _id: id,
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await ticket.save();
    return this.findById(id);
  }

  static async update(id, data) {
    await CompanyTicketSchema.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
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
    const result = await CompanyTicketSchema.findOneAndDelete({ id });
    return result;
  }
}

module.exports = CompanyTicket;
