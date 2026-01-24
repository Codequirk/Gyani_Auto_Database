const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class Admin {
  static async findById(id) {
    return db('admins').where({ id, deleted_at: null }).first();
  }

  static async findByEmail(email) {
    return db('admins').where({ email, deleted_at: null }).first();
  }

  static async findAll() {
    return db('admins').where({ deleted_at: null }).orderBy('created_at', 'desc');
  }

  static async create(data) {
    const id = uuidv4();
    await db('admins').insert({
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async update(id, data) {
    await db('admins').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });
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
