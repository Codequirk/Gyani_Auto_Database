const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true, index: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN'], default: 'ADMIN' },
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null, index: true },
  updated_by_admin_id: { type: String, default: null },
}, { collection: 'admins' });

adminSchema.index({ email: 1, deleted_at: 1 });

module.exports = mongoose.model('Admin', adminSchema);
