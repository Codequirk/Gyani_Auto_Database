const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true },
  contact_person: { type: String, default: '' },
  email: { type: String, default: '', unique: true, sparse: true },
  phone_number: { type: String, default: '' },
  emails: { type: [String], default: [] },
  phone_numbers: { type: [String], default: [] },
  password_hash: { type: String, default: null },
  required_autos: { type: Number, default: 0 },
  area_id: { type: String, default: null },
  days_requested: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
    index: true
  },
  company_status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'REJECTED'],
    default: 'PENDING_APPROVAL',
    index: true
  },
  rejection_reason: { type: String, default: null },
  created_by_admin_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null, index: true },
}, { collection: 'companies' });

companySchema.index({ status: 1, deleted_at: 1 });

module.exports = mongoose.model('Company', companySchema);
