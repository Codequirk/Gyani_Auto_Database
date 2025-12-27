const AssignmentSchema = require('./schemas/AssignmentSchema');
const { v4: uuidv4 } = require('uuid');

class Assignment {
  static async findById(id) {
    const assignment = await AssignmentSchema.findOne({ id });
    return assignment ? assignment.toObject() : null;
  }

  static async findByAutoAndCompany(autoId, companyId) {
    const assignment = await AssignmentSchema.findOne({ auto_id: autoId, company_id: companyId, status: 'ACTIVE' });
    return assignment ? assignment.toObject() : null;
  }

  static async findActive() {
    const assignments = await AssignmentSchema.find({ status: 'ACTIVE' }).sort({ start_date: -1 });
    return assignments.map(a => a.toObject());
  }

  static async findByAutoId(autoId) {
    const assignments = await AssignmentSchema.find({ auto_id: autoId }).sort({ start_date: -1 });
    return assignments.map(a => a.toObject());
  }

  static async findByCompanyId(companyId) {
    const assignments = await AssignmentSchema.find({ company_id: companyId }).sort({ start_date: -1 });
    return assignments.map(a => a.toObject());
  }

  static async findCurrentActiveAssignment(autoId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await AssignmentSchema.findOne({
      auto_id: autoId,
      status: { $in: ['ACTIVE', 'PREBOOKED'] },
      start_date: { $lte: today },
      end_date: { $gte: today }
    }).sort({ start_date: -1 });

    return assignment ? assignment.toObject() : null;
  }

  static async create(data) {
    const id = uuidv4();
    const assignment = new AssignmentSchema({
      _id: id,
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await assignment.save();
    return this.findById(id);
  }

  static async update(id, data) {
    await AssignmentSchema.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return this.findById(id);
  }

  static async updateStatus(id, status) {
    return this.update(id, { status });
  }

  static async createBulk(assignments) {
    if (!assignments.length) return [];
    
    const results = [];
    for (const assignment of assignments) {
      const id = uuidv4();
      const newAssignment = new AssignmentSchema({
        _id: id,
        id,
        ...assignment,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await newAssignment.save();
      results.push(newAssignment);
    }
    
    return results;
  }

  static async deleteByAutoId(autoId) {
    const result = await AssignmentSchema.deleteMany({ auto_id: autoId });
    return result;
  }

  static async deleteByCompanyId(companyId) {
    const result = await AssignmentSchema.deleteMany({ company_id: companyId });
    return result;
  }

  static async deleteById(id) {
    const result = await AssignmentSchema.findOneAndDelete({ id });
    return result;
  }
}

module.exports = Assignment;
