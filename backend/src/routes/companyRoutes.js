const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/auth');

router.get('/', companyController.listCompanies);
router.get('/:id', companyController.getCompany);

router.post('/', authMiddleware, companyController.createCompany);
router.patch('/:id', authMiddleware, companyController.updateCompany);
router.delete('/:id', authMiddleware, companyController.deleteCompany);

module.exports = router;
