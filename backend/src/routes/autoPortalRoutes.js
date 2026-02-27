/**
 * Auto Portal Routes
 * Authenticated with autoAuth middleware
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const autoAuthMiddleware = require('../middleware/autoAuth');
const db = require('../models/db');

/**
 * Helper function to convert relative image URLs to production-safe full URLs
 */
const getFullImageUrl = (relativeUrl) => {
  if (!relativeUrl) return null;
  
  // If it's already a full URL, return as-is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  
  // Get BASE_URL from environment
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
  
  // Remove leading slash if present to avoid double slashes
  const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
  
  return `${baseUrl}/${cleanUrl}`;
};

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/auto-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
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
 * GET /:autoId
 * Get auto details (requires auto auth)
 */
router.get('/:autoId', autoAuthMiddleware, async (req, res, next) => {
  try {
    const auto = req.auto;

    res.json({
      id: auto.id,
      auto_no: auto.auto_no,
      owner_name: auto.owner_name,
      driver_phone: auto.driver_phone,
      image_url: getFullImageUrl(auto.image_url), // ✅ Return full URL to frontend
      image_upload_date: auto.image_upload_date || null,
      image_week_number: auto.image_week_number || null,
      image_year: auto.image_year || null,
    });
  } catch (error) {
    console.error('[AUTO-PORTAL] Error getting auto details:', error);
    next(error);
  }
});

/**
 * POST /upload-image
 * Upload advertisement image for auto
 * Requires auto auth
 */
router.post('/upload-image', autoAuthMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const auto = req.auto;
    const filename = req.file.filename;
    const imageUrl = `/uploads/auto-images/${filename}`;
    const filePath = req.file.path;
    const now = new Date();

    console.log('[AUTO-PORTAL] Image upload for auto:', {
      auto_id: auto.id,
      auto_no: auto.auto_no,
      filename,
      imageUrl,
      filePath,
    });

    // ✅ VERIFY FILE EXISTS IMMEDIATELY AFTER UPLOAD
    if (!fs.existsSync(filePath)) {
      console.error('[AUTO-PORTAL] ERROR: File not found after multer upload!', filePath);
      return res.status(500).json({ error: 'File upload failed - file not persisted to disk' });
    }
    console.log('[AUTO-PORTAL] ✓ File verified on disk:', filePath);

    // Delete old image if it exists
    if (auto.image_url) {
      const oldImagePath = path.join(__dirname, '../../uploads', auto.image_url.replace('/uploads/', ''));
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
          console.log('[AUTO-PORTAL] Old image deleted:', oldImagePath);
        } catch (err) {
          console.error('[AUTO-PORTAL] Error deleting old image:', err);
        }
      }
    }

    // Calculate week number
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - firstDay) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);

    // Update auto with new image
    await db('autos')
      .where({ id: auto.id })
      .update({
        image_url: imageUrl,
        image_upload_date: now,
        image_week_number: weekNumber,
        image_year: now.getFullYear(),
        image_status: 'UPLOADED',
        updated_at: now,
      });

    console.log('[AUTO-PORTAL] ✓ Auto updated with image');

    res.json({
      message: 'Image uploaded successfully',
      image_url: getFullImageUrl(imageUrl), // ✅ Return full URL to frontend
      image_upload_date: now,
      image_week_number: weekNumber,
      image_year: now.getFullYear(),
    });
  } catch (error) {
    console.error('[AUTO-PORTAL] Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('[AUTO-PORTAL] Cleaned up uploaded file on error');
      } catch (err) {
        console.error('[AUTO-PORTAL] Error cleaning up file:', err);
      }
    }
    
    next(error);
  }
});

module.exports = router;
