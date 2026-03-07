const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class CompanyRequest {
  static async findById(id) {
    return db('company_requests').where({ id }).first();
  }

  static async findByCompanyId(companyId, options = {}) {
    let query = db('company_requests')
      .where({ company_id: companyId });

    // Exclude dismissed rejected requests unless explicitly requested
    if (!options.includeDismissed) {
      query = query.where((builder) => {
        builder
          .where({ 'company_requests.status': 'PENDING' })
          .orWhere({ 'company_requests.status': 'APPROVED' })
          .orWhere(function () {
            this.where({ 'company_requests.status': 'REJECTED' }).where({ 'company_requests.dismissed_by_company': false });
          });
      });
    }

    // Include auto details
    const requests = await query
      .leftJoin('autos', 'company_requests.auto_id', '=', 'autos.id')
      .select(
        'company_requests.id',
        'company_requests.company_id',
        'company_requests.auto_id',
        'company_requests.status',
        'company_requests.rejection_reason',
        'company_requests.dismissed_by_company',
        'company_requests.created_at',
        'company_requests.updated_at',
        'autos.id as auto_id',
        'autos.auto_no',
        'autos.owner_name as auto_name'
      )
      .orderBy('company_requests.updated_at', 'DESC');

    return requests.map(req => ({
      id: req.id,
      company_id: req.company_id,
      auto_id: req.auto_id,
      status: req.status,
      rejection_reason: req.rejection_reason,
      dismissed_by_company: req.dismissed_by_company,
      created_at: req.created_at,
      updated_at: req.updated_at,
      auto: req.auto_id ? {
        id: req.auto_id,
        auto_no: req.auto_no,
        name: req.auto_name
      } : null
    }));
  }

  static async findByAutoId(autoId) {
    return db('company_requests').where({ auto_id: autoId }).first();
  }

  static async create(data) {
    const id = uuidv4();
    await db('company_requests').insert({
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async update(id, data) {
    await db('company_requests').where({ id }).update({
      ...data,
      updated_at: new Date(),
    });
    return this.findById(id);
  }

  static async reject(id, rejectionReason) {
    return this.update(id, {
      status: 'REJECTED',
      rejection_reason: rejectionReason.trim(),
      dismissed_by_company: false,
    });
  }

  static async approve(id) {
    return this.update(id, {
      status: 'APPROVED',
    });
  }

  static async dismiss(id) {
    // Only dismiss if already rejected
    const request = await this.findById(id);
    if (request && request.status === 'REJECTED') {
      return this.update(id, {
        dismissed_by_company: true,
      });
    }
    throw new Error('Only rejected requests can be dismissed');
  }

  static async delete(id) {
    return db('company_requests').where({ id }).delete();
  }

  static async deleteByCompanyId(companyId) {
    return db('company_requests').where({ company_id: companyId }).delete();
  }

  static async deleteByAutoId(autoId) {
    return db('company_requests').where({ auto_id: autoId }).delete();
  }
}

module.exports = CompanyRequest;
