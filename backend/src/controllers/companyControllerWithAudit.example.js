/**
 * EXAMPLE: Controllers with Full Audit Trail
 * 
 * Demonstrates how to implement CRUD operations with:
 * - Automatic audit field management
 * - Soft delete functionality
 * - Restore functionality
 * - Audit history retrieval
 */

const Company = require('../models/Company'); // Use updated model with audit
const { logAuditTrail } = require('../utils/auditUtils');

/**
 * ==========================================
 * CREATE OPERATION (with audit)
 * ==========================================
 */
exports.createCompany = async (req, res, next) => {
  try {
    const { name, email, phone_number, address, area_id } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Get admin ID from request (set by auth middleware)
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create company with audit trail
    const company = await Company.create(
      {
        name,
        email,
        phone_number,
        address,
        area_id,
        status: 'ACTIVE',
      },
      adminId
    );

    res.status(201).json({
      message: 'Company created successfully',
      company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * UPDATE OPERATION (with audit)
 * ==========================================
 */
exports.updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone_number, address, area_id, status } = req.body;

    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update company with audit trail
    const company = await Company.update(
      id,
      {
        name,
        email,
        phone_number,
        address,
        area_id,
        status,
      },
      adminId
    );

    res.json({
      message: 'Company updated successfully',
      company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * SOFT DELETE OPERATION
 * ==========================================
 */
exports.deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Soft delete company
    const success = await Company.softDelete(id, adminId);

    res.json({
      message: 'Company deleted (soft delete - can be restored)',
      success,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * RESTORE OPERATION
 * ==========================================
 */
exports.restoreCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Restore soft-deleted company
    const company = await Company.restore(id, adminId);

    res.json({
      message: 'Company restored successfully',
      company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * GET ACTIVE COMPANIES
 * ==========================================
 */
exports.listCompanies = async (req, res, next) => {
  try {
    const { status, area_id } = req.query;

    // Automatically excludes deleted records
    const companies = await Company.findAll({ status, area_id });

    res.json({
      count: companies.length,
      companies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * GET DELETED COMPANIES (Admin only)
 * ==========================================
 */
exports.listDeletedCompanies = async (req, res, next) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get deleted companies
    const companies = await Company.findDeleted();

    res.json({
      message: 'Deleted companies (can be restored)',
      count: companies.length,
      companies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * GET AUDIT HISTORY FOR A COMPANY
 * ==========================================
 */
exports.getCompanyAuditHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get audit history
    const history = await Company.getAuditHistory(id);

    res.json({
      company_id: id,
      total_changes: history.length,
      audit_history: history.map(entry => ({
        action: entry.action,
        changed_by: entry.changed_by,
        changed_at: entry.created_on,
        changed_fields: entry.changed_fields,
        details: {
          old_values: JSON.parse(entry.old_values || '{}'),
          new_values: JSON.parse(entry.new_values || '{}'),
        },
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * BULK SOFT DELETE
 * ==========================================
 */
exports.bulkDeleteCompanies = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid IDs array' });
    }

    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let deletedCount = 0;

    // Soft delete each company
    for (const id of ids) {
      try {
        await Company.softDelete(id, adminId);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete company ${id}:`, error);
      }
    }

    res.json({
      message: 'Bulk delete completed',
      total_requested: ids.length,
      successfully_deleted: deletedCount,
      failed: ids.length - deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * AUDIT STATISTICS (Admin Dashboard)
 * ==========================================
 */
exports.getAuditStatistics = async (req, res, next) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get audit stats
    const stats = await req.db('audit_logs')
      .select(
        'action',
        req.db.raw('COUNT(*) as count'),
        req.db.raw('COUNT(DISTINCT entity_id) as unique_entities'),
        req.db.raw('DATE(created_on) as date')
      )
      .groupBy('action', req.db.raw('DATE(created_on)'))
      .orderBy('date', 'desc')
      .limit(30);

    res.json({
      message: 'Audit statistics',
      stats,
    });
  } catch (error) {
    next(error);
  }
};
