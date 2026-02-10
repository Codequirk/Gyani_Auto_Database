const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const autoController = require('../controllers/autoController');
const advertisementImageController = require('../controllers/advertisementImageController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');

// Configure multer for image uploads (temporary storage)
const uploadsDir = path.join(__dirname, '../../uploads/temp');

// Ensure temp directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

router.get('/', autoController.listAutos);
router.get('/available/count', autoController.getAvailableAutosCount);
router.get('/:id', autoController.getAuto);
router.get('/:id/assignments', autoController.getAutoAssignments);

router.post('/', authMiddleware, autoController.createAuto);
router.patch('/:id', authMiddleware, autoController.updateAuto);
router.delete('/:id', authMiddleware, autoController.deleteAuto);

// Advertisement Image routes
router.post('/:autoId/advertisement-image', authMiddleware, upload.single('file'), advertisementImageController.uploadAdvertisementImage);
router.get('/:autoId/advertisement-image', advertisementImageController.getAdvertisementImage);
router.delete('/:autoId/advertisement-image', authMiddleware, advertisementImageController.deleteAdvertisementImage);

module.exports = router;
