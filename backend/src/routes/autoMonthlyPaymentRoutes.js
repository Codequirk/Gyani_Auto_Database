const express = require('express');
const router = express.Router();
const autoMonthlyPaymentController = require('../controllers/autoMonthlyPaymentController');
const authMiddleware = require('../middleware/auth');

// All routes require admin authentication
router.use(authMiddleware);

// Create auto monthly payment
router.post('/', autoMonthlyPaymentController.createAutoMonthlyPayment);

// Get all auto monthly payments
router.get('/', autoMonthlyPaymentController.getAutoMonthlyPayments);

// Get payments for a specific auto
router.get('/auto/:autoId', autoMonthlyPaymentController.getAutoMonthlyPaymentsByAuto);

// Update auto monthly payment
router.patch('/:paymentId', autoMonthlyPaymentController.updateAutoMonthlyPayment);

// Delete auto monthly payment
router.delete('/:paymentId', autoMonthlyPaymentController.deleteAutoMonthlyPayment);

module.exports = router;
