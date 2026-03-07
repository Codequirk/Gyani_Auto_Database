const express = require('express');
const router = express.Router();
const companyRequestController = require('../controllers/companyRequestController');
const companyAuthMiddleware = require('../middleware/companyAuth');
const authMiddleware = require('../middleware/auth');

/**
 * ⚠️  DEPRECATED - Use company-ticket routes instead
 * These routes are being phased out in favor of /company-tickets
 * All new features should use the unified company_tickets system.
 */

/**
 * Company Routes - Require company authentication
 */

// Get all company requests (PENDING, APPROVED, REJECTED)
router.get(
  '/company/:companyId',
  companyAuthMiddleware,
  companyRequestController.getCompanyRequests
);

// Get single request
router.get(
  '/:requestId',
  authMiddleware,
  companyRequestController.getCompanyRequestById
);

// Create new request
router.post(
  '/',
  companyAuthMiddleware,
  companyRequestController.createCompanyRequest
);

// Company: Dismiss rejected request notification
router.patch(
  '/:requestId/dismiss',
  companyAuthMiddleware,
  companyRequestController.dismissCompanyRequest
);

/**
 * Admin Routes - Require admin authentication
 */

// Admin: Approve request
router.patch(
  '/:requestId/approve',
  authMiddleware,
  companyRequestController.approveCompanyRequest
);

// Admin: Reject request with reason
router.patch(
  '/:requestId/reject',
  authMiddleware,
  companyRequestController.rejectCompanyRequest
);

// Admin: Delete request
router.delete(
  '/:requestId',
  authMiddleware,
  companyRequestController.deleteCompanyRequest
);

module.exports = router;
