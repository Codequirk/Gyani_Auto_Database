const express = require('express');
const router = express.Router();
const autoController = require('../controllers/autoController');
const authMiddleware = require('../middleware/auth');

router.get('/', autoController.listAutos);
router.get('/:id', autoController.getAuto);
router.get('/:id/assignments', autoController.getAutoAssignments);

router.post('/', authMiddleware, autoController.createAuto);
router.patch('/:id', authMiddleware, autoController.updateAuto);
router.delete('/:id', authMiddleware, autoController.deleteAuto);

module.exports = router;
