/**
 * Auto Image Management Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const autoImageController = require('../controllers/autoImageController');
const authMiddleware = require('../middleware/auth');
const dualAuthMiddleware = require('../middleware/dualAuth');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

/**
 * GET /image-sections
 * Get autos categorized into 3 image sections
 * Protected: Admin and Company
 */
router.get('/image-sections', dualAuthMiddleware, autoImageController.getImageSections);

/**
 * POST /:id/upload-image
 * Upload or replace auto image
 * Protected: Admin only
 */
router.post('/:id/upload-image', 
  authMiddleware, 
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('[Multer Error]', err.message);
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        console.error('[Upload Error]', err.message);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  autoImageController.uploadImage
);

/**
 * DELETE /:id/delete-image
 * Delete auto image manually
 * Protected: Admin only
 */
router.delete('/:id/delete-image', authMiddleware, autoImageController.deleteImage);

// Error handler for any other errors
router.use((err, req, res, next) => {
  console.error('[Route Error]', err.message);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

module.exports = router;
