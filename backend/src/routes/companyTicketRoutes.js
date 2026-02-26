const express = require('express');
const router = express.Router();
const companyTicketController = require('../controllers/companyTicketController');
const authMiddleware = require('../middleware/authMiddleware');
const companyAuthMiddleware = require('../middleware/authMiddleware');

// Admin endpoints - require admin auth (MUST be before generic :id routes)
router.get('/admin/pending', authMiddleware, companyTicketController.getPendingTickets);
router.get('/admin/all', authMiddleware, companyTicketController.getAllTickets);
router.get('/admin/:id/available-autos', authMiddleware, companyTicketController.getAvailableAutosForTicket);
router.patch('/admin/:id/approve', authMiddleware, companyTicketController.approveTicket);
router.patch('/admin/:id/reject', authMiddleware, companyTicketController.rejectTicket);
router.patch('/admin/:id', authMiddleware, companyTicketController.updateTicket);

// Company endpoints - require company auth
router.post('/', companyAuthMiddleware, companyTicketController.createTicket);

// Get company tickets - requires company auth
router.get('/company/:company_id', companyAuthMiddleware, companyTicketController.getCompanyTickets);

module.exports = router;