const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', adminController.listAdmins);
router.post('/', adminController.createAdmin);
router.get('/:id', adminController.getAdmin);
router.patch('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;
