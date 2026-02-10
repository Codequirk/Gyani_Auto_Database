const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const authMiddleware = require('../middleware/auth');

router.get('/', areaController.listAreas);
router.post('/', authMiddleware, areaController.createArea);
router.get('/:id', areaController.getArea);
router.patch('/:id', authMiddleware, areaController.updateArea);
router.delete('/:id', authMiddleware, areaController.deleteArea);

module.exports = router;
