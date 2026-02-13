/**
 * Audit Utilities - Centralized audit and soft delete logic
 * 
 * Provides:
 * - Audit trail tracking (created_by, created_on, updated_by, updated_on)
 * - Soft delete with restore functionality
 * - Audit query builders
 * - Automatic user context handling
 */

const db = require('../models/db');

/**
 * Get audit context from request (admin/user performing the action)
 * @param {Object} req - Express request object
 * @returns {Object} Audit context with user id and timestamp
 */
const getAuditContext = (req) => {
  const userId = req.admin?.id || req.user?.id || req.company?.id || 'SYSTEM';
  const userType = req.admin ? 'ADMIN' : req.user ? 'USER' : req.company ? 'COMPANY' : 'SYSTEM';
  
  return {
    userId,
    userType,
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  };
};

/**
 * Prepare audit fields for INSERT
 * @param {Object} data - Data to insert
 * @param {string} userId - User ID performing the action
 * @returns {Object} Data with audit fields
 */
const prepareAuditFieldsForCreate = (data, userId) => {
  return {
    ...data,
    created_by: userId,
    created_on: new Date(),
    updated_by: userId,
    updated_on: new Date(),
    is_deleted: false,
  };
};

/**
 * Prepare audit fields for UPDATE
 * @param {Object} data - Data to update
 * @param {string} userId - User ID performing the action
 * @returns {Object} Data with audit fields
 */
const prepareAuditFieldsForUpdate = (data, userId) => {
  return {
    ...data,
    updated_by: userId,
    updated_on: new Date(),
  };
};

/**
 * Soft delete a record
 * @param {string} tableName - Table name
 * @param {string} recordId - Record ID to delete
 * @param {string} userId - User ID performing the delete
 * @returns {Promise<boolean>} Success status
 */
const softDelete = async (tableName, recordId, userId) => {
  try {
    await db(tableName)
      .where({ id: recordId })
      .update({
        is_deleted: true,
        updated_by: userId,
        updated_on: new Date(),
      });
    return true;
  } catch (error) {
    console.error(`Error soft deleting from ${tableName}:`, error);
    throw error;
  }
};

/**
 * Soft delete multiple records
 * @param {string} tableName - Table name
 * @param {Array<string>} recordIds - Array of record IDs
 * @param {string} userId - User ID performing the delete
 * @returns {Promise<number>} Number of records deleted
 */
const softDeleteMany = async (tableName, recordIds, userId) => {
  try {
    const count = await db(tableName)
      .whereIn('id', recordIds)
      .update({
        is_deleted: true,
        updated_by: userId,
        updated_on: new Date(),
      });
    return count;
  } catch (error) {
    console.error(`Error soft deleting multiple records from ${tableName}:`, error);
    throw error;
  }
};

/**
 * Restore a soft-deleted record
 * @param {string} tableName - Table name
 * @param {string} recordId - Record ID to restore
 * @param {string} userId - User ID performing the restore
 * @returns {Promise<boolean>} Success status
 */
const restoreRecord = async (tableName, recordId, userId) => {
  try {
    await db(tableName)
      .where({ id: recordId })
      .update({
        is_deleted: false,
        updated_by: userId,
        updated_on: new Date(),
      });
    return true;
  } catch (error) {
    console.error(`Error restoring record from ${tableName}:`, error);
    throw error;
  }
};

/**
 * Query builder that automatically excludes deleted records
 * @param {string} tableName - Table name
 * @returns {Object} Knex query object
 */
const queryActive = (tableName) => {
  return db(tableName).where({ is_deleted: false });
};

/**
 * Query builder that includes deleted records
 * @param {string} tableName - Table name
 * @returns {Object} Knex query object
 */
const queryAll = (tableName) => {
  return db(tableName);
};

/**
 * Query builder for deleted records only
 * @param {string} tableName - Table name
 * @returns {Object} Knex query object
 */
const queryDeleted = (tableName) => {
  return db(tableName).where({ is_deleted: true });
};

/**
 * Get audit history for a record
 * @param {string} tableName - Table name
 * @param {string} recordId - Record ID
 * @returns {Promise<Object>} Audit history
 */
const getAuditHistory = async (tableName, recordId) => {
  try {
    // This assumes you have an audit_logs table
    const history = await db('audit_logs')
      .where({ entity_type: tableName, entity_id: recordId })
      .orderBy('created_on', 'desc');
    
    return history;
  } catch (error) {
    console.error(`Error fetching audit history:`, error);
    return [];
  }
};

/**
 * Create audit log entry
 * @param {Object} auditData - Audit log data
 * @returns {Promise<void>}
 */
const logAuditTrail = async (auditData) => {
  try {
    await db('audit_logs').insert({
      id: require('uuid').v4(),
      entity_type: auditData.entityType,
      entity_id: auditData.entityId,
      action: auditData.action, // CREATE, UPDATE, DELETE, RESTORE
      changed_fields: JSON.stringify(auditData.changedFields || {}),
      old_values: JSON.stringify(auditData.oldValues || {}),
      new_values: JSON.stringify(auditData.newValues || {}),
      changed_by: auditData.changedBy,
      ip_address: auditData.ipAddress,
      user_agent: auditData.userAgent,
      created_on: new Date(),
    });
  } catch (error) {
    console.error('Error logging audit trail:', error);
    // Don't throw - audit logging failure shouldn't break main operation
  }
};

/**
 * Check if record is soft deleted
 * @param {string} tableName - Table name
 * @param {string} recordId - Record ID
 * @returns {Promise<boolean>} True if deleted
 */
const isDeleted = async (tableName, recordId) => {
  try {
    const record = await db(tableName)
      .where({ id: recordId })
      .select('is_deleted')
      .first();
    
    return record ? record.is_deleted : true;
  } catch (error) {
    console.error(`Error checking deletion status:`, error);
    return true;
  }
};

module.exports = {
  getAuditContext,
  prepareAuditFieldsForCreate,
  prepareAuditFieldsForUpdate,
  softDelete,
  softDeleteMany,
  restoreRecord,
  queryActive,
  queryAll,
  queryDeleted,
  getAuditHistory,
  logAuditTrail,
  isDeleted,
};
