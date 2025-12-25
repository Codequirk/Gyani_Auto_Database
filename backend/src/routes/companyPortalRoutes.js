const express = require('express');
const router = express.Router();
const companyPortalController = require('../controllers/companyPortalController');
const companyAuthMiddleware = require('../middleware/companyAuth');

// All routes require company authentication
router.use(companyAuthMiddleware);

router.get('/:company_id/profile', companyPortalController.getCompanyProfile);
router.patch('/:company_id/profile', companyPortalController.updateCompanyProfile);
router.get('/:company_id/assignments', companyPortalController.getCompanyAssignments);
router.get('/:company_id/dashboard', companyPortalController.getCompanyDashboard);

module.exports = router;
