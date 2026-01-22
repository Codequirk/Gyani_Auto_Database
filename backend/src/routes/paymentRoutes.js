const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

// All payment routes require authentication
router.use(authMiddleware);

/**
 * GET /api/payments/all
 * Get all payments (for admin dashboard)
 */
router.get('/all', paymentController.getAllPayments);

/**
 * POST /api/payments/add
 * Add a new payment for an auto in a ticket
 */
router.post('/add', paymentController.addPayment);

/**
 * GET /api/payments/ticket/:ticket_id
 * Get all payments for a ticket
 */
router.get('/ticket/:ticket_id', paymentController.getTicketPayments);

/**
 * GET /api/payments/ticket/:ticket_id/summary
 * Get payment summary for a ticket
 */
router.get('/ticket/:ticket_id/summary', paymentController.getTicketPaymentSummary);

/**
 * GET /api/payments/ticket/:ticket_id/available-autos
 * Get autos available to add payment for this ticket
 */
router.get('/ticket/:ticket_id/available-autos', paymentController.getAvailableAutosForTicketPayment);

/**
 * GET /api/payments/company/:company_id
 * Get all payments for a company
 */
router.get('/company/:company_id', paymentController.getCompanyPayments);

/**
 * GET /api/payments/status/:status
 * Get payments by status
 */
router.get('/status/:status', paymentController.getPaymentsByStatus);

/**
 * PATCH /api/payments/:id
 * Update payment details
 */
router.patch('/:id', paymentController.updatePayment);

/**
 * DELETE /api/payments/:id
 * Delete a payment record
 */
router.delete('/:id', paymentController.deletePayment);

/**
 * PATCH /api/payments/bulk/update-status
 * Bulk update payment status
 */
router.patch('/bulk/update-status', paymentController.bulkUpdatePaymentStatus);

module.exports = router;
