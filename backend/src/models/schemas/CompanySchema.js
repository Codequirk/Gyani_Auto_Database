const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true },
  contact_person: { type: String, default: '' },
  email: { type: String, default: '' },
  phone_number: { type: String, default: '' },
  emails: { type: [String], default: [] },
  phone_numbers: { type: [String], default: [] },
  required_autos: { type: Number, required: true },
  area_id: { type: String, required: true },
  days_requested: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
    index: true
  },
  created_by_admin_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null, index: true },
}, { collection: 'companies' });

companySchema.index({ status: 1, deleted_at: 1 });

module.exports = mongoose.model('Company', companySchema);
