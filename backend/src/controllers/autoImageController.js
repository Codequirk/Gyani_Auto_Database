/**
 * Auto Image Management Controller
 * Handles image upload, categorization, and lifecycle
 */

const Auto = require('../models/Auto');
const db = require('../models/db');
const imageUtils = require('../utils/imageManagement');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

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

/**
 * Get autos categorized into 3 image sections
 */
exports.getImageSections = async (req, res, next) => {
  try {
    console.log('📋 Fetching auto image sections...');
    
    // Get ALL non-deleted autos (not just those with ACTIVE assignments)
    // This ensures images show up regardless of assignment status
    const allAutos = await db('autos')
      .where({ deleted_at: null })
      .select('id', 'auto_no', 'owner_name', 'status', 'image_url', 'image_upload_date', 'image_week_number', 'image_year');
    
    console.log(`✓ Found ${allAutos.length} total non-deleted autos`);
    
    // Categorize ALL autos by their image status (not filtered by assignment)
    const sections = {
      MISSING: [],
      BUFFER: [],
      UPLOADED: []
    };
    
    for (const auto of allAutos) {
      const section = imageUtils.getAutoImageSection(auto);
      
      // Every auto MUST appear in one of the 3 sections
      if (section) {
        sections[section].push({
          ...auto,
          image_url: getFullImageUrl(auto.image_url), // ✅ Convert to full URL for frontend
          section,
          uploadedDate: auto.image_upload_date ? new Date(auto.image_upload_date).toLocaleDateString('en-IN') : null,
          weekNumber: auto.image_week_number,
          year: auto.image_year
        });
      } else {
        // Safety fallback: if section is null, place in MISSING
        console.warn(`⚠️  Auto ${auto.auto_no} returned null section, placing in MISSING`);
        sections.MISSING.push({
          ...auto,
          image_url: getFullImageUrl(auto.image_url), // ✅ Convert to full URL for frontend
          section: 'MISSING',
          uploadedDate: auto.image_upload_date ? new Date(auto.image_upload_date).toLocaleDateString('en-IN') : null,
          weekNumber: auto.image_week_number,
          year: auto.image_year
        });
      }
    }
    
    console.log(`✓ Section breakdown:`);
    console.log(`  MISSING: ${sections.MISSING.length}`);
    console.log(`  BUFFER: ${sections.BUFFER.length}`);
    console.log(`  UPLOADED: ${sections.UPLOADED.length}`);
    console.log(`  TOTAL: ${sections.MISSING.length + sections.BUFFER.length + sections.UPLOADED.length}`);
    
    // Validate math
    const totalInSections = sections.MISSING.length + sections.BUFFER.length + sections.UPLOADED.length;
    if (totalInSections !== allAutos.length) {
      console.error(`❌ Math error! Sections don't add up: ${sections.MISSING.length} + ${sections.BUFFER.length} + ${sections.UPLOADED.length} = ${totalInSections}, expected ${allAutos.length}`);
    }
    
    res.json({
      summary: {
        total: allAutos.length,
        missing: sections.MISSING.length,
        buffer: sections.BUFFER.length,
        uploaded: sections.UPLOADED.length,
      },
      sections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload or replace auto image
 */
exports.uploadImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_id = req.admin?.id;
    
    console.log(`[uploadImage] Starting upload for auto ${id}`);
    console.log(`[uploadImage] File info:`, req.file ? { name: req.file.originalname, size: req.file.size } : 'NO FILE');
    console.log(`[uploadImage] Admin:`, admin_id);
    
    if (!req.file) {
      console.error('[uploadImage] No file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    console.log(`📸 Uploading image for auto ${id}...`);
    
    // Verify auto exists (query directly without soft-delete filter for image upload)
    console.log(`[uploadImage] Looking for auto with ID: ${id}`);
    const auto = await db('autos').where({ id }).first();
    console.log(`[uploadImage] Auto lookup result:`, auto ? { id: auto.id, auto_no: auto.auto_no, deleted_at: auto.deleted_at } : 'NOT FOUND');
    if (!auto) {
      // Clean up uploaded file
      await fsPromises.unlink(req.file.path).catch(() => {});
      console.error(`[uploadImage] Auto ${id} not found in database`);
      return res.status(404).json({ error: 'Auto not found' });
    }
    
    // Get current week info
    const currentWeek = imageUtils.getCurrentWeekNumber();
    const currentYear = imageUtils.getCurrentYear();
    
    // Generate unique filename
    const fileName = `auto_${id}_week${currentWeek}_${uuidv4()}.${req.file.mimetype.split('/')[1]}`;
    const uploadDir = path.join(__dirname, '../../uploads/auto-images');
    
    // Ensure upload directory exists
    await fsPromises.mkdir(uploadDir, { recursive: true });
    
    // Save file
    const filePath = path.join(uploadDir, fileName);
    await fsPromises.copyFile(req.file.path, filePath);
    
    // ✅ VERIFY FILE WAS ACTUALLY COPIED
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ERROR: File copy failed for ${fileName}`);
      throw new Error(`File was not successfully saved: ${fileName}`);
    }
    console.log(`✓ File verified on disk: ${filePath}`);
    
    await fsPromises.unlink(req.file.path).catch(() => {});
    
    // If auto already has an old image, optionally delete it
    if (auto.image_url) {
      const oldImagePath = path.join(__dirname, '../../', auto.image_url);
      await fsPromises.unlink(oldImagePath).catch(() => {
        console.warn(`Could not delete old image: ${oldImagePath}`);
      });
    }
    
    // Save image metadata to database with relative path for file operations
    const imageUrl = `/uploads/auto-images/${fileName}`;
    
    const updateResult = await db('autos')
      .where({ id })
      .update({
        image_url: imageUrl,
        image_upload_date: new Date(),
        image_week_number: currentWeek,
        image_year: currentYear,
        image_status: 'UPLOADED',
        updated_at: new Date(),
      });
    
    console.log(`✓ Image uploaded for auto ${id} (Week ${currentWeek}/${currentYear})`);
    console.log(`  File: ${fileName}`);
    console.log(`  Database update result: ${updateResult} rows affected`);
    
    // Verify the update in database
    const updatedAuto = await db('autos').where({ id }).first();
    console.log(`  Verified in DB: image_url=${updatedAuto.image_url}, week=${updatedAuto.image_week_number}/${updatedAuto.image_year}`);
    
    res.json({
      message: 'Image uploaded successfully',
      auto: {
        id,
        auto_no: auto.auto_no,
        imageUrl: getFullImageUrl(imageUrl), // ✅ Return full URL to frontend
        uploadedDate: new Date().toLocaleDateString('en-IN'),
        weekNumber: currentWeek,
        year: currentYear,
        section: 'UPLOADED'
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete auto image manually
 */
exports.deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_id = req.admin?.id;
    
    console.log(`🗑️  Deleting image for auto ${id}...`);
    
    // Query directly without soft-delete filter
    const auto = await db('autos').where({ id }).first();
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }
    
    if (!auto.image_url) {
      return res.status(400).json({ error: 'Auto has no image to delete' });
    }
    
    // Delete file from storage
    const imagePath = path.join(__dirname, '../../', auto.image_url);
    await fsPromises.unlink(imagePath).catch(() => {
      console.warn(`Could not delete image file: ${imagePath}`);
    });
    
    // Clear image metadata
    await db('autos')
      .where({ id })
      .update({
        image_url: null,
        image_upload_date: null,
        image_week_number: null,
        image_year: null,
        image_status: 'MISSING',
        last_image_deleted_date: new Date(),
        updated_at: new Date(),
      });
    
    console.log(`✓ Image deleted for auto ${id}`);
    
    res.json({
      message: 'Image deleted successfully',
      auto: {
        id,
        auto_no: auto.auto_no,
        section: 'MISSING'
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-delete images past Tuesday deadline (CRON JOB)
 */
exports.autoDeleteExpiredImages = async () => {
  try {
    console.log('⏰ Running auto-delete for expired images...');
    
    // Get all autos with old images
    const autosToDelete = await db('autos')
      .where({ status: 'ACTIVE', deleted_at: null })
      .whereNotNull('image_url')
      .select('id', 'auto_no', 'image_url', 'image_week_number', 'image_year');
    
    let deletedCount = 0;
    
    for (const auto of autosToDelete) {
      if (imageUtils.shouldAutoDeleteImage(auto)) {
        const imagePath = path.join(__dirname, '../../', auto.image_url);
        await fsPromises.unlink(imagePath).catch(() => {
          console.warn(`Could not delete expired image: ${imagePath}`);
        });
        
        await db('autos')
          .where({ id: auto.id })
          .update({
            image_url: null,
            image_upload_date: null,
            image_week_number: null,
            image_year: null,
            image_status: 'MISSING',
            last_image_deleted_date: new Date(),
            updated_at: new Date(),
          });
        
        console.log(`  ✓ Auto-deleted image for ${auto.auto_no}`);
        deletedCount++;
      }
    }
    
    console.log(`✅ Auto-delete completed. Deleted ${deletedCount} expired images`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Auto-delete error:', error.message);
    throw error;
  }
};

/**
 * Update buffer section status (CRON JOB - Sunday 00:00)
 */
exports.updateBufferSectionStatus = async () => {
  try {
    console.log('📊 Updating buffer section statuses (Sunday routine)...');
    
    // This is more of a logical operation - statuses are computed based on week numbers
    // Just log and verify the system is working
    const sections = await exports.getImageSections({ admin: null }, { json: () => {} }, () => {});
    
    console.log(`✅ Buffer section update: MISSING=${sections.missing}, BUFFER=${sections.buffer}, UPLOADED=${sections.uploaded}`);
  } catch (error) {
    console.error('❌ Buffer update error:', error.message);
    throw error;
  }
};

module.exports = exports;
