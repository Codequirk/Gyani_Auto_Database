const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  auto_id: { type: String, required: true, index: true },
  company_id: { type: String, required: true, index: true },
  company_name: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true, index: true },
  days: { type: Number, default: 0 }, // Total number of days for assignment
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'PREBOOKED'],
    default: 'ACTIVE',
    index: true,
  },
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
}, { collection: 'assignments' });

assignmentSchema.index({ auto_id: 1 });
assignmentSchema.index({ company_id: 1 });
assignmentSchema.index({ end_date: 1 });
assignmentSchema.index({ status: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
