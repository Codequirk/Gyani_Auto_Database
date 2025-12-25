const mongoose = require('mongoose');

const companyTicketSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  company_id: { type: String, required: true, index: true },
  autos_required: { type: Number, required: true },
  days_required: { type: Number, required: true },
  start_date: { type: Date, required: true },
  area_id: { type: String, default: null },
  area_name: { type: String, default: 'Any Area' },
  ticket_status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  notes: { type: String, default: '' },
  admin_notes: { type: String, default: '' },
  rejected_reason: { type: String, default: '' },
  approved_by_admin_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { collection: 'company_tickets' });

companyTicketSchema.index({ company_id: 1, ticket_status: 1 });
companyTicketSchema.index({ ticket_status: 1, created_at: -1 });

module.exports = mongoose.model('CompanyTicket', companyTicketSchema);
