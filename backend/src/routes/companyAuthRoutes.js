const express = require('express');
const router = express.Router();
const companyAuthController = require('../controllers/companyAuthController');

router.post('/register', companyAuthController.registerCompany);
router.post('/login', companyAuthController.loginCompany);

module.exports = router;
