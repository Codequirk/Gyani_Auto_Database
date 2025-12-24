const mongoose = require('mongoose');

const autoSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  auto_no: { type: String, unique: true, required: true, index: true },
  owner_name: { type: String, required: true },
  area_id: { type: String, required: true, index: true },
  area_name: { type: String, default: null },
  status: {
    type: String,
    enum: ['IDLE', 'PRE_ASSIGNED', 'ASSIGNED'],
    default: 'IDLE',
    index: true,
  },
  last_updated_at: { type: Date, default: Date.now, index: true },
  notes: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null, index: true },
}, { collection: 'autos' });

autoSchema.index({ auto_no: 1, deleted_at: 1 });
autoSchema.index({ status: 1, deleted_at: 1 });
autoSchema.index({ area_id: 1 });

module.exports = mongoose.model('Auto', autoSchema);
