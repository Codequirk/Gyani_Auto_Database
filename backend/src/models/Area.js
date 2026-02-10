const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const Auto = require('./Auto');

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

  static async getAutosInArea(id) {
    // Get all autos in this area
    return db('autos').where({ area_id: id });
  }

  static async deleteWithAutos(id) {
    // Get all autos in this area
    const autos = await db('autos').where({ area_id: id });
    
    // Hard delete all assignments for these autos
    for (const auto of autos) {
      await db('assignments').where({ auto_id: auto.id }).del();
    }
    
    // Hard delete all autos in this area
    await db('autos').where({ area_id: id }).del();
    
    // Delete the area
    return db('areas').where({ id }).del();
  }

  static async delete(id) {
    // Simple delete - only if no autos exist
    return db('areas').where({ id }).del();
  }
}

module.exports = Area;
