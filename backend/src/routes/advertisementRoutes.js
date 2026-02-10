const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const companyAuthMiddleware = require('../middleware/companyAuth');
const advertisementController = require('../controllers/advertisementController');

console.log('[ROUTES] Loading advertisement routes');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/advertisements');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const { autoId, companyId } = req.params;
    const timestamp = Date.now();
    const filename = `${autoId}-${companyId}-${timestamp}.png`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow PNG files
    if (file.mimetype === 'image/png' || file.originalname.endsWith('.png')) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Admin routes - protected with auth middleware
// More specific routes first (with /image suffix)
router.get('/autos/:autoId/company/:companyId/advertisement/image', (req, res, next) => {
  console.log('[AD-ROUTE] Image route hit', req.params);
  advertisementController.getAdvertisementImage(req, res, next);
});
// Then general routes
router.post('/autos/:autoId/company/:companyId/advertisement', authMiddleware, upload.single('image'), (req, res, next) => {
  console.log('[AD-ROUTE] POST advertisement', req.params);
  advertisementController.uploadAdvertisement(req, res, next);
});
router.get('/autos/:autoId/company/:companyId/advertisement', authMiddleware, (req, res, next) => {
  console.log('[AD-ROUTE] GET advertisement', req.params);
  advertisementController.getAdvertisement(req, res, next);
});
router.delete('/autos/:autoId/company/:companyId/advertisement', authMiddleware, (req, res, next) => {
  console.log('[AD-ROUTE] DELETE advertisement', req.params);
  advertisementController.deleteAdvertisement(req, res, next);
});
router.delete('/autos/:autoId/advertisements', authMiddleware, (req, res, next) => {
  console.log('[AD-ROUTE] DELETE auto advertisements', req.params);
  advertisementController.deleteAdvertisementByAuto(req, res, next);
});

// Company portal routes - protected with company auth middleware
router.get('/company-portal/autos/:autoId/company/:companyId/advertisement/image', advertisementController.getAdvertisementImage);
router.get('/company-portal/autos/:autoId/company/:companyId/advertisement', companyAuthMiddleware, advertisementController.getAdvertisement);

module.exports = router;
