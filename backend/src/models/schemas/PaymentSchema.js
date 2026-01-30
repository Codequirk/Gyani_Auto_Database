const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  ticket_id: { type: String, required: true, index: true },
  auto_id: { type: String, required: true, index: true },
  company_id: { type: String, required: true, index: true },
  area_id: { type: String, default: null },
  area_name: { type: String, default: '' },
  auto_no: { type: String, required: true },
  owner_name: { type: String, default: '' },
  cost_per_day: { type: Number, required: true, default: 0 },
  total_days: { type: Number, required: true, default: 0 },
  total_cost: { type: Number, required: true, default: 0 }, // cost_per_day * total_days
  assigned_by_admin_id: { type: String, default: null },
  assigned_time: { type: Date, default: () => new Date() }, // Time when assignment was created/assigned
  payment_status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
}, { collection: 'payments' });

paymentSchema.index({ ticket_id: 1 });
paymentSchema.index({ auto_id: 1 });
paymentSchema.index({ company_id: 1 });
paymentSchema.index({ payment_status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

