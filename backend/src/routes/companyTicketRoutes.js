const express = require('express');
const router = express.Router();
const companyTicketController = require('../controllers/companyTicketController');
const authMiddleware = require('../middleware/auth');
const companyAuthMiddleware = require('../middleware/companyAuth');

// Admin endpoints - require admin auth (MUST be before company routes)
router.get('/admin/pending', authMiddleware, companyTicketController.getPendingTickets);
router.get('/admin/all', authMiddleware, companyTicketController.getAllTickets);
router.patch('/admin/:id/approve', authMiddleware, companyTicketController.approveTicket);
router.patch('/admin/:id/reject', authMiddleware, companyTicketController.rejectTicket);
router.patch('/admin/:id', authMiddleware, companyTicketController.updateTicket);
router.get('/admin/:id/suggest-autos', authMiddleware, companyTicketController.suggestAutosForTicket);
// Company endpoints - require company auth
router.post('/', companyAuthMiddleware, companyTicketController.createTicket);

// Get company tickets - requires company auth
router.get('/company/:company_id', companyAuthMiddleware, companyTicketController.getCompanyTickets);

module.exports = router;