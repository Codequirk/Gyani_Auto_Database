const CompanySchema = require('./schemas/CompanySchema');
const AssignmentSchema = require('./schemas/AssignmentSchema');
const { v4: uuidv4 } = require('uuid');

class Company {
  static async findById(id) {
    const company = await CompanySchema.findOne({ id, deleted_at: null });
    return company ? company.toObject() : null;
  }

  static async findAll(filters = {}) {
    let query = { deleted_at: null };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    const companies = await CompanySchema.find(query).sort({ created_at: -1 });
    return companies.map(c => c.toObject());
  }

  static async create(data) {
    const id = uuidv4();
    const company = new CompanySchema({
      _id: id,
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await company.save();
    return this.findById(id);
  }

  static async update(id, data) {
    await CompanySchema.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date() },
      { new: true }
    );
    return this.findById(id);
  }

  static async softDelete(id) {
    await CompanySchema.findOneAndUpdate(
      { id },
      { deleted_at: new Date(), updated_at: new Date() },
      { new: true }
    );
  }

  static async getWithAssignments(id) {
    const company = await this.findById(id);
    if (!company) return null;

    const assignments = await AssignmentSchema.find({ company_id: id }).sort({ start_date: -1 });
    const enrichedAssignments = assignments.map(a => a.toObject ? a.toObject() : a);

    return { ...company, assignments: enrichedAssignments };
  }
}

module.exports = Company;
