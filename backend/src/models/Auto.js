const AutoSchema = require('./schemas/AutoSchema');
const AreaSchema = require('./schemas/AreaSchema');
const AssignmentSchema = require('./schemas/AssignmentSchema');
const { v4: uuidv4 } = require('uuid');

class Auto {
  static async findById(id) {
    const auto = await AutoSchema.findOne({ id, deleted_at: null });
    if (!auto) return null;
    
    const autoObj = auto.toObject();
    const area = await AreaSchema.findOne({ id: autoObj.area_id });
    if (area) {
      autoObj.area_name = area.name;
    }
    return autoObj;
  }

  static async findByAutoNo(autoNo) {
    const auto = await AutoSchema.findOne({ auto_no: autoNo, deleted_at: null });
    if (!auto) return null;
    
    const autoObj = auto.toObject();
    const area = await AreaSchema.findOne({ id: autoObj.area_id });
    if (area) {
      autoObj.area_name = area.name;
    }
    return autoObj;
  }

  static async findAll(filters = {}) {
    let query = { deleted_at: null };

    if (filters.area_id) {
      query.area_id = filters.area_id;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    let autos = await AutoSchema.find(query).sort({ created_at: -1 });
    
    for (let i = 0; i < autos.length; i++) {
      const autoObj = autos[i].toObject();
      const area = await AreaSchema.findOne({ id: autoObj.area_id });
      if (area) autoObj.area_name = area.name;
      autos[i] = autoObj;
    }

    // Apply search filter on client side after enriching with area_name
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      autos = autos.filter(auto => 
        searchRegex.test(auto.auto_no || '') ||
        searchRegex.test(auto.owner_name || '') ||
        searchRegex.test(auto.area_name || '')
      );
    }
    
    return autos;
  }

  static async create(data) {
    const id = uuidv4();
    const auto = new AutoSchema({
      _id: id,
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
      last_updated_at: new Date(),
    });
    await auto.save();
    
    // Convert to plain object and enrich with area name
    const autoObj = auto.toObject();
    const area = await AreaSchema.findOne({ id: data.area_id });
    if (area) {
      autoObj.area_name = area.name;
    }
    
    return autoObj;
  }

  static async update(id, data) {
    await AutoSchema.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date(), last_updated_at: new Date() },
      { new: true }
    );
    return this.findById(id);
  }

  static async updateStatus(id, status) {
    return this.update(id, { status });
  }

  static async softDelete(id) {
    await AutoSchema.findOneAndUpdate(
      { id },
      { deleted_at: new Date(), updated_at: new Date() },
      { new: true }
    );
  }

  static async getWithAssignments(id) {
    const auto = await this.findById(id);
    if (!auto) return null;

    const assignments = await AssignmentSchema.find({ auto_id: id }).sort({ start_date: -1 });
    let assignmentObjs = assignments.map(a => a.toObject ? a.toObject() : a);

    // Enrich assignments with company_name
    const Company = require('./Company');
    assignmentObjs = await Promise.all(
      assignmentObjs.map(async (a) => {
        if (a.company_id) {
          const company = await Company.findById(a.company_id);
          a.company_name = company?.name || 'Unknown';
        }
        return a;
      })
    );

    return { ...auto, assignments: assignmentObjs };
  }

  static async getIdleAutos() {
    let autos = await AutoSchema.find({ status: 'IDLE', deleted_at: null }).sort({ last_updated_at: 1 });
    
    for (let i = 0; i < autos.length; i++) {
      const autoObj = autos[i].toObject();
      const area = await AreaSchema.findOne({ id: autoObj.area_id });
      if (area) autoObj.area_name = area.name;
      autos[i] = autoObj;
    }
    
    return autos;
  }

  static async getPriorityAutos(daysThreshold = 2) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const assignments = await AssignmentSchema.find({
      end_date: { $lte: thresholdDate, $gte: today },
      status: { $in: ['ACTIVE', 'PREBOOKED'] },
    });

    const autosMap = new Map();
    for (let assignment of assignments) {
      const auto = await AutoSchema.findOne({ id: assignment.auto_id, deleted_at: null });
      if (auto) {
        const autoObj = auto.toObject();
        const area = await AreaSchema.findOne({ id: autoObj.area_id });
        if (area) autoObj.area_name = area.name;
        autosMap.set(autoObj.id, autoObj);
      }
    }

    return Array.from(autosMap.values());
  }

  static async getPreAssignedCount() {
    return AutoSchema.countDocuments({ status: 'PRE_ASSIGNED', deleted_at: null });
  }

  static async getAssignedCount() {
    return AutoSchema.countDocuments({ status: 'ASSIGNED', deleted_at: null });
  }

  static async getIdleCount() {
    return AutoSchema.countDocuments({ status: 'IDLE', deleted_at: null });
  }
}

module.exports = Auto;
