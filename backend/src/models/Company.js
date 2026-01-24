const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class Company {
  static async findById(id) {
    return db('companies').where({ id, deleted_at: null }).first();
  }

  static async findByEmail(email) {
    return db('companies').where({ email, deleted_at: null }).first();
  }

  static async findAll(filters = {}) {
    let query = db('companies').where({ deleted_at: null });

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    if (filters.search) {
      query = query.whereRaw('name ILIKE ?', [`%${filters.search}%`]);
    }

    return query.orderBy('created_at', 'desc');
  }

  static async create(data) {
    const id = uuidv4();
    await db('companies').insert({
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async update(id, data) {
    await db('companies').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async softDelete(id) {
    await db('companies').where({ id }).update({
      deleted_at: new Date(),
      updated_at: new Date(),
    });
  }

  static async getWithAssignments(id) {
    const company = await this.findById(id);
    if (!company) return null;

    const assignments = await db('assignments').where({ company_id: id }).orderBy('start_date', 'desc');

    return { ...company, assignments };
  }
}

module.exports = Company;
