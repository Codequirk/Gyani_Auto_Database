const AdminSchema = require('./schemas/AdminSchema');
const { v4: uuidv4 } = require('uuid');

class Admin {
  static async findById(id) {
    const admin = await AdminSchema.findOne({ id, deleted_at: null });
    return admin ? admin.toObject() : null;
  }

  static async findByEmail(email) {
    const admin = await AdminSchema.findOne({ email, deleted_at: null });
    return admin ? admin.toObject() : null;
  }

  static async findAll() {
    const admins = await AdminSchema.find({ deleted_at: null }).sort({ created_at: -1 });
    return admins.map(a => a.toObject());
  }

  static async create(data) {
    const id = uuidv4();
    const admin = new AdminSchema({
      _id: id,
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await admin.save();
    return this.findById(id);
  }

  static async update(id, data) {
    await AdminSchema.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return this.findById(id);
  }

  static async softDelete(id, updatedByAdminId) {
    return this.update(id, {
      deleted_at: new Date(),
      updated_by_admin_id: updatedByAdminId,
    });
  }
}

module.exports = Admin;
