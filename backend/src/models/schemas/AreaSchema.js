const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, unique: true, required: true, index: true },
  name: { type: String, unique: true, required: true, index: true },
  pin_code: { type: String, index: true },
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
}, { collection: 'areas' });

module.exports = mongoose.model('Area', areaSchema);
