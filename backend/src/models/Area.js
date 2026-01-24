const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class Area {
  static async findById(id) {
    return db('areas').where({ id }).first();
  }

  static async findAll() {
    return db('areas').orderBy('name', 'asc');
  }

  static async create(data) {
    const id = uuidv4();
    await db('areas').insert({
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async update(id, data) {
    await db('areas').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async delete(id) {
    return db('areas').where({ id }).del();
  }
}

module.exports = Area;
