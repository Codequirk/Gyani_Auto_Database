/**
 * Advertisement Image Controller
 * 
 * Handles uploading, serving, and deleting advertisement images for autos
 * - PNG only
 * - One image per ACTIVE auto
 * - Auto-deletes after 7 days
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AdvertisementImage = require('../models/AdvertisementImage');
const Auto = require('../models/Auto');
const Assignment = require('../models/Assignment');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/advertisements');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * POST /autos/:autoId/advertisement-image
 * Upload a PNG advertisement image for an auto
 * 
 * Requirements:
 * - Auto must exist
 * - Auto must have at least one ACTIVE assignment
 * - File must be PNG only
 * - Replaces existing image if any
 */
exports.uploadAdvertisementImage = async (req, res, next) => {
  try {
    const { autoId } = req.params;
    const file = req.file;

    console.log('[ADV-IMAGE] Upload request for auto:', autoId);
    console.log('[ADV-IMAGE] File:', file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    } : 'NO FILE');

    // Validate file
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (file.mimetype !== 'image/png') {
      console.log('[ADV-IMAGE] Invalid mimetype:', file.mimetype);
      // Clean up uploaded file
      fs.unlink(file.path, () => {});
      return res.status(400).json({ error: 'Only PNG images are accepted' });
    }

    // Verify auto exists
    const auto = await Auto.findById(autoId);
    if (!auto) {
      fs.unlink(file.path, () => {});
      return res.status(404).json({ error: 'Auto not found' });
    }

    // Verify auto has at least one ACTIVE assignment
    const allAssignments = await Assignment.findAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('[ADV-IMAGE] Today:', today.toISOString());
    console.log('[ADV-IMAGE] Auto ID:', autoId);
    console.log('[ADV-IMAGE] Total assignments in DB:', allAssignments.length);
    
    // Check if auto has assignment where TODAY falls within the date range
    const relevantAssignments = allAssignments.filter(a => a.auto_id === autoId);
    console.log('[ADV-IMAGE] Assignments for this auto:', relevantAssignments.length);
    relevantAssignments.forEach((a, idx) => {
      const assignStart = new Date(a.start_date);
      assignStart.setHours(0, 0, 0, 0);
      const assignEnd = new Date(a.end_date);
      assignEnd.setHours(0, 0, 0, 0);
      console.log(`[ADV-IMAGE]   [${idx}] Status: ${a.status}, Start: ${assignStart.toISOString()}, End: ${assignEnd.toISOString()}`);
    });
    
    const hasActiveAssignment = allAssignments.some(a => {
      if (a.auto_id !== autoId) return false;
      
      // Assignment status could be ACTIVE or PREBOOKED
      // We need to check if TODAY falls within the date range
      const assignStart = new Date(a.start_date);
      assignStart.setHours(0, 0, 0, 0);
      
      const assignEnd = new Date(a.end_date);
      assignEnd.setHours(0, 0, 0, 0);
      
      // Check if today is within the assignment period
      return today >= assignStart && today <= assignEnd;
    });

    console.log('[ADV-IMAGE] Has active assignment:', hasActiveAssignment);
    if (!hasActiveAssignment) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ error: 'Auto must have an active assignment (today must fall within assignment dates) to upload advertisement' });
    }

    // Delete old image if exists
    const existingImage = await AdvertisementImage.findByAutoId(autoId);
    if (existingImage) {
      try {
        const oldPath = path.join(UPLOADS_DIR, existingImage.filename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (err) {
        console.warn(`[ADV-IMAGE] Failed to delete old image: ${err.message}`);
      }
      await AdvertisementImage.deleteByAutoId(autoId);
    }

    // Generate new filename
    const filename = `${autoId}_${uuidv4()}.png`;
    const finalPath = path.join(UPLOADS_DIR, filename);

    // Move uploaded file to permanent location
    fs.renameSync(file.path, finalPath);

    // Create database record
    const record = await AdvertisementImage.create(autoId, filename);

    console.log(`[ADV-IMAGE] ✓ Image uploaded for auto ${autoId}: ${filename}`);

    res.json({
      success: true,
      message: 'Advertisement image uploaded successfully',
      image: {
        id: record.id,
        auto_id: record.auto_id,
        filename: record.filename,
        url: `/api/autos/${autoId}/advertisement-image`,
        uploaded_at: record.uploaded_at,
        expires_at: record.expires_at,
      },
    });
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('[ADV-IMAGE] Upload error:', error);
    next(error);
  }
};

/**
 * GET /autos/:autoId/advertisement-image
 * Serve advertisement image for an auto
 * 
 * Returns:
 * - Image file if exists and not expired
 * - 404 if not found or expired (auto-deletes expired)
 */
exports.getAdvertisementImage = async (req, res, next) => {
  try {
    const { autoId } = req.params;

    // Find non-expired image
    const image = await AdvertisementImage.findByAutoId(autoId);

    if (!image) {
      return res.status(404).json({ error: 'No advertisement image found' });
    }

    // Serve the image
    const imagePath = path.join(UPLOADS_DIR, image.filename);

    if (!fs.existsSync(imagePath)) {
      // Image record exists but file doesn't - clean up record
      await AdvertisementImage.deleteByAutoId(autoId);
      return res.status(404).json({ error: 'Image file not found' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.sendFile(imagePath);
  } catch (error) {
    console.error('[ADV-IMAGE] Fetch error:', error);
    next(error);
  }
};

/**
 * DELETE /autos/:autoId/advertisement-image
 * Delete advertisement image for an auto (manual deletion)
 */
exports.deleteAdvertisementImage = async (req, res, next) => {
  try {
    const { autoId } = req.params;

    const image = await AdvertisementImage.findByAutoId(autoId);
    if (!image) {
      return res.status(404).json({ error: 'No advertisement image found' });
    }

    // Delete file
    try {
      const imagePath = path.join(UPLOADS_DIR, image.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (err) {
      console.warn(`[ADV-IMAGE] Failed to delete file: ${err.message}`);
    }

    // Delete record
    await AdvertisementImage.deleteByAutoId(autoId);

    console.log(`[ADV-IMAGE] ✓ Image deleted for auto ${autoId}`);

    res.json({
      success: true,
      message: 'Advertisement image deleted successfully',
    });
  } catch (error) {
    console.error('[ADV-IMAGE] Delete error:', error);
    next(error);
  }
};

/**
 * Cleanup expired images (called by scheduler)
 * Deletes both database records and files for expired images
 */
exports.cleanupExpiredImages = async () => {
  try {
    const expiredImages = await AdvertisementImage.findExpired();

    if (expiredImages.length === 0) {
      console.log('[ADV-IMAGE] No expired images to clean up');
      return;
    }

    // Delete files
    for (const image of expiredImages) {
      try {
        const imagePath = path.join(UPLOADS_DIR, image.filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.warn(`[ADV-IMAGE] Failed to delete file during cleanup: ${err.message}`);
      }
    }

    // Delete database records
    const deletedCount = await AdvertisementImage.deleteExpired();
    console.log(`[ADV-IMAGE] ✓ Cleaned up ${deletedCount} expired advertisement images`);
  } catch (error) {
    console.error('[ADV-IMAGE] Cleanup error:', error);
  }
};
