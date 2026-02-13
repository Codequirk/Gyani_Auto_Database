/**
 * EXAMPLE: Routes with Soft Delete and Restore APIs
 * 
 * Demonstrates all CRUD operations with audit trail:
 * - POST /api/companies - Create with audit
 * - GET /api/companies - List active companies
 * - GET /api/companies/deleted - List deleted companies (admin only)
 * - GET /api/companies/:id - Get company details
 * - GET /api/companies/:id/audit-history - Get audit trail
 * - PATCH /api/companies/:id - Update with audit
 * - DELETE /api/companies/:id - Soft delete
 * - POST /api/companies/:id/restore - Restore soft-deleted
 * - POST /api/companies/bulk/delete - Bulk soft delete
 * - GET /api/audit/statistics - Audit statistics
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const auditMiddleware = require('../middleware/auditMiddleware');
const companyController = require('../controllers/companyController');

/**
 * All routes have audit middleware to capture context
 */
router.use(auditMiddleware);

/**
 * ==========================================
 * CREATE - POST /api/companies
 * ==========================================
 * Creates a new company with audit trail
 * 
 * Request body:
 * {
 *   "name": "ABC Company",
 *   "email": "contact@abccompany.com",
 *   "phone_number": "9876543210",
 *   "address": "123 Main St",
 *   "area_id": "uuid-here"
 * }
 * 
 * Response:
 * {
 *   "message": "Company created successfully",
 *   "company": {
 *     "id": "uuid",
 *     "name": "ABC Company",
 *     "created_by": "admin-id",
 *     "created_on": "2026-02-13T10:00:00Z",
 *     "updated_by": "admin-id",
 *     "updated_on": "2026-02-13T10:00:00Z",
 *     "is_deleted": false
 *   }
 * }
 */
router.post(
  '/',
  authMiddleware,
  companyController.createCompany
);

/**
 * ==========================================
 * READ - GET /api/companies
 * ==========================================
 * Lists all active companies (is_deleted = false)
 * 
 * Query parameters:
 * - status: ACTIVE, INACTIVE
 * - area_id: uuid
 * 
 * Response:
 * {
 *   "count": 5,
 *   "companies": [...]
 * }
 */
router.get(
  '/',
  authMiddleware,
  companyController.listCompanies
);

/**
 * ==========================================
 * READ DELETED - GET /api/companies/deleted
 * ==========================================
 * Lists all soft-deleted companies (admin only)
 * These can be restored
 * 
 * Response:
 * {
 *   "message": "Deleted companies (can be restored)",
 *   "count": 2,
 *   "companies": [...]
 * }
 */
router.get(
  '/deleted',
  authMiddleware,
  companyController.listDeletedCompanies
);

/**
 * ==========================================
 * READ ONE - GET /api/companies/:id
 * ==========================================
 * Gets a single company's details
 * 
 * Response:
 * {
 *   "id": "uuid",
 *   "name": "ABC Company",
 *   "email": "contact@abccompany.com",
 *   "created_by": "admin-id",
 *   "created_on": "2026-02-13T10:00:00Z",
 *   "updated_by": "admin-id",
 *   "updated_on": "2026-02-13T10:00:00Z",
 *   "is_deleted": false
 * }
 */
router.get(
  '/:id',
  authMiddleware,
  companyController.getCompany
);

/**
 * ==========================================
 * AUDIT HISTORY - GET /api/companies/:id/audit-history
 * ==========================================
 * Gets complete audit trail for a company
 * Shows all changes, who made them, and when
 * 
 * Response:
 * {
 *   "company_id": "uuid",
 *   "total_changes": 5,
 *   "audit_history": [
 *     {
 *       "action": "CREATE",
 *       "changed_by": "admin-id",
 *       "changed_at": "2026-02-13T10:00:00Z",
 *       "changed_fields": ["name", "email"],
 *       "details": {
 *         "old_values": {},
 *         "new_values": {
 *           "name": "ABC Company",
 *           "email": "contact@abccompany.com"
 *         }
 *       }
 *     },
 *     {
 *       "action": "UPDATE",
 *       "changed_by": "admin-id",
 *       "changed_at": "2026-02-14T11:30:00Z",
 *       "changed_fields": ["status"],
 *       "details": {
 *         "old_values": { "status": "ACTIVE" },
 *         "new_values": { "status": "INACTIVE" }
 *       }
 *     }
 *   ]
 * }
 */
router.get(
  '/:id/audit-history',
  authMiddleware,
  companyController.getCompanyAuditHistory
);

/**
 * ==========================================
 * UPDATE - PATCH /api/companies/:id
 * ==========================================
 * Updates a company and logs changes
 * 
 * Request body:
 * {
 *   "name": "Updated Company Name",
 *   "status": "INACTIVE"
 * }
 * 
 * Response:
 * {
 *   "message": "Company updated successfully",
 *   "company": {...updated data...}
 * }
 */
router.patch(
  '/:id',
  authMiddleware,
  companyController.updateCompany
);

/**
 * ==========================================
 * SOFT DELETE - DELETE /api/companies/:id
 * ==========================================
 * Soft deletes a company (sets is_deleted = true)
 * The company can be restored later
 * 
 * Response:
 * {
 *   "message": "Company deleted (soft delete - can be restored)",
 *   "success": true
 * }
 */
router.delete(
  '/:id',
  authMiddleware,
  companyController.deleteCompany
);

/**
 * ==========================================
 * RESTORE - POST /api/companies/:id/restore
 * ==========================================
 * Restores a soft-deleted company (sets is_deleted = false)
 * 
 * Response:
 * {
 *   "message": "Company restored successfully",
 *   "company": {...restored data with is_deleted: false...}
 * }
 */
router.post(
  '/:id/restore',
  authMiddleware,
  companyController.restoreCompany
);

/**
 * ==========================================
 * BULK SOFT DELETE - POST /api/companies/bulk/delete
 * ==========================================
 * Soft deletes multiple companies at once
 * 
 * Request body:
 * {
 *   "ids": ["uuid1", "uuid2", "uuid3"]
 * }
 * 
 * Response:
 * {
 *   "message": "Bulk delete completed",
 *   "total_requested": 3,
 *   "successfully_deleted": 3,
 *   "failed": 0
 * }
 */
router.post(
  '/bulk/delete',
  authMiddleware,
  companyController.bulkDeleteCompanies
);

/**
 * ==========================================
 * AUDIT STATISTICS - GET /api/audit/statistics
 * ==========================================
 * Admin-only endpoint showing audit activity
 * 
 * Response:
 * {
 *   "message": "Audit statistics",
 *   "stats": [
 *     {
 *       "action": "CREATE",
 *       "count": 10,
 *       "unique_entities": 10,
 *       "date": "2026-02-13"
 *     },
 *     {
 *       "action": "UPDATE",
 *       "count": 5,
 *       "unique_entities": 3,
 *       "date": "2026-02-13"
 *     }
 *   ]
 * }
 */
router.get(
  '/audit/statistics',
  authMiddleware,
  companyController.getAuditStatistics
);

module.exports = router;

/**
 * ==========================================
 * IMPLEMENTATION CHECKLIST
 * ==========================================
 * 
 * To implement this audit system:
 * 
 * 1. ✅ Create auditUtils.js (utility functions)
 * 2. ✅ Create auditMiddleware.js (capture context)
 * 3. ✅ Create migration template
 * 4. ✅ Run migration to add audit fields to tables
 * 5. ✅ Update model classes to use auditUtils
 * 6. ✅ Update controllers to pass adminId to models
 * 7. ✅ Update routes with new endpoints (restore, audit history, etc.)
 * 8. Add to main index.js:
 *    - app.use(auditMiddleware);
 *    - Mount audit routes
 * 9. Test:
 *    - Create a company -> verify audit fields
 *    - Update company -> verify audit log
 *    - Delete company -> verify is_deleted = true
 *    - Restore company -> verify is_deleted = false
 *    - Check audit history -> verify all changes logged
 * 
 */
