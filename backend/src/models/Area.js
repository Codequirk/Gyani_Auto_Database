const AreaSchema = require('./schemas/AreaSchema');
const { v4: uuidv4 } = require('uuid');

class Area {
  static async findById(id) {
    const area = await AreaSchema.findOne({ id });
    return area ? area.toObject() : null;
  }

  static async findAll() {
    const areas = await AreaSchema.find().sort({ name: 1 });
    return areas.map(a => a.toObject());
  }

  static async create(data) {
    const id = uuidv4();
    const area = new AreaSchema({
      _id: id,
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await area.save();
    return this.findById(id);
  }
}

module.exports = Area;
