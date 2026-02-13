/**
 * EXAMPLE: Updated Model with Full Audit Trail
 * 
 * This is a template showing how to integrate audit fields
 * into your model classes. Use this pattern for all models.
 * 
 * Replaces the basic Admin.js pattern with comprehensive audit support.
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const {
  prepareAuditFieldsForCreate,
  prepareAuditFieldsForUpdate,
  queryActive,
  logAuditTrail,
} = require('../utils/auditUtils');

/**
 * Company Model with Audit Trail Support
 * 
 * Features:
 * - Automatic audit field management (created_by, created_on, updated_by, updated_on)
 * - Soft delete (is_deleted flag)
 * - Audit logging
 * - Query builders that exclude deleted records by default
 */
class Company {
  /**
   * Find company by ID (active records only)
   * @param {string} id - Company ID
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return queryActive('companies')
      .where({ id })
      .first();
  }

  /**
   * Find company by email (active records only)
   * @param {string} email - Company email
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    return queryActive('companies')
      .where({ email })
      .first();
  }

  /**
   * Find all companies (active records only)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>}
   */
  static async findAll(filters = {}) {
    let query = queryActive('companies');
    
    if (filters.status) {
      query = query.where({ status: filters.status });
    }
    
    if (filters.area_id) {
      query = query.where({ area_id: filters.area_id });
    }
    
    return query.orderBy('created_on', 'desc');
  }

  /**
   * Create new company with audit trail
   * @param {Object} data - Company data
   * @param {string} adminId - Admin ID creating the record
   * @returns {Promise<Object>} Created company
   */
  static async create(data, adminId) {
    const id = uuidv4();
    
    // Prepare data with audit fields
    const auditedData = prepareAuditFieldsForCreate(
      { id, ...data },
      adminId
    );

    try {
      await db('companies').insert(auditedData);

      // Log to audit trail
      await logAuditTrail({
        entityType: 'companies',
        entityId: id,
        action: 'CREATE',
        changedFields: Object.keys(data),
        newValues: auditedData,
        changedBy: adminId,
      });

      return this.findById(id);
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Update company with audit trail
   * @param {string} id - Company ID
   * @param {Object} data - Data to update
   * @param {string} adminId - Admin ID making the update
   * @returns {Promise<Object>} Updated company
   */
  static async update(id, data, adminId) {
    try {
      // Get old values for audit trail
      const oldRecord = await this.findById(id);
      if (!oldRecord) {
        throw new Error('Company not found');
      }

      // Prepare data with audit fields
      const auditedData = prepareAuditFieldsForUpdate(data, adminId);

      // Update record
      await db('companies')
        .where({ id })
        .update(auditedData);

      // Calculate changed fields
      const changedFields = Object.keys(data).filter(
        key => oldRecord[key] !== data[key]
      );

      // Log to audit trail
      if (changedFields.length > 0) {
        await logAuditTrail({
          entityType: 'companies',
          entityId: id,
          action: 'UPDATE',
          changedFields,
          oldValues: Object.fromEntries(
            changedFields.map(field => [field, oldRecord[field]])
          ),
          newValues: Object.fromEntries(
            changedFields.map(field => [field, data[field]])
          ),
          changedBy: adminId,
        });
      }

      return this.findById(id);
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Soft delete company
   * @param {string} id - Company ID
   * @param {string} adminId - Admin ID performing the delete
   * @returns {Promise<boolean>} Success status
   */
  static async softDelete(id, adminId) {
    try {
      // Get company before deletion for audit
      const company = await this.findById(id);
      if (!company) {
        throw new Error('Company not found');
      }

      // Soft delete
      await db('companies')
        .where({ id })
        .update({
          is_deleted: true,
          updated_by: adminId,
          updated_on: new Date(),
        });

      // Log to audit trail
      await logAuditTrail({
        entityType: 'companies',
        entityId: id,
        action: 'DELETE',
        changedFields: ['is_deleted'],
        oldValues: { is_deleted: false },
        newValues: { is_deleted: true },
        changedBy: adminId,
      });

      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Restore soft-deleted company
   * @param {string} id - Company ID
   * @param {string} adminId - Admin ID performing the restore
   * @returns {Promise<Object>} Restored company
   */
  static async restore(id, adminId) {
    try {
      // Update is_deleted flag
      await db('companies')
        .where({ id })
        .update({
          is_deleted: false,
          updated_by: adminId,
          updated_on: new Date(),
        });

      // Log to audit trail
      await logAuditTrail({
        entityType: 'companies',
        entityId: id,
        action: 'RESTORE',
        changedFields: ['is_deleted'],
        oldValues: { is_deleted: true },
        newValues: { is_deleted: false },
        changedBy: adminId,
      });

      return this.findById(id);
    } catch (error) {
      console.error('Error restoring company:', error);
      throw error;
    }
  }

  /**
   * Find deleted companies (for admin viewing)
   * @returns {Promise<Array>} Deleted companies
   */
  static async findDeleted() {
    return db('companies')
      .where({ is_deleted: true })
      .orderBy('updated_on', 'desc');
  }

  /**
   * Get audit history for a company
   * @param {string} id - Company ID
   * @returns {Promise<Array>} Audit log entries
   */
  static async getAuditHistory(id) {
    return db('audit_logs')
      .where({ entity_type: 'companies', entity_id: id })
      .orderBy('created_on', 'desc')
      .limit(50); // Last 50 changes
  }

  /**
   * Permanently delete company (hard delete - use with caution)
   * @param {string} id - Company ID
   * @returns {Promise<boolean>} Success status
   * @deprecated Use softDelete instead
   */
  static async hardDelete(id) {
    console.warn('⚠️  Hard delete used - data will be permanently lost');
    return db('companies').where({ id }).del();
  }
}

module.exports = Company;
