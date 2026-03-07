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
 * 
 * ONLY ACTIVE, non-deleted autos appear in image management.
 * Sections are computed dynamically based on week numbers - NOT stored in database.
 */
exports.getImageSections = async (req, res, next) => {
  try {
    console.log('📋 Fetching auto image sections (ACTIVE autos only)...');
    
    // ✅ CRITICAL: Fetch ONLY ACTIVE, non-deleted autos
    const activeAutos = await db('autos')
  .join('assignments', 'autos.id', 'assignments.auto_id')
  .where('assignments.status', 'ACTIVE')
  .whereNull('autos.deleted_at')
  .distinct(
    'autos.id',
    'autos.auto_no',
    'autos.owner_name',
    'autos.status',
    'autos.image_url',
    'autos.image_upload_date',
    'autos.image_week_number',
    'autos.image_year'
  );

console.log(`✓ Found ${activeAutos.length} autos with ACTIVE assignments`);
    // Compute sections dynamically based on week numbers
    const sections = {
      MISSING: [],
      BUFFER: [],
      UPLOADED: []
    };
    
    const currentWeek = imageUtils.getCurrentWeekNumber();
    const currentYear = imageUtils.getCurrentYear();
    
    for (const auto of activeAutos) {
      // Determine section based on week numbers only
      let section;
      let sectionImageUrl = null; // For MISSING section, never return image_url
      
      // No image at all = MISSING
      if (!auto.image_url || !auto.image_week_number) {
        section = 'MISSING';
      }
      // Current week image = UPLOADED
      else if (auto.image_week_number === currentWeek && auto.image_year === currentYear) {
        section = 'UPLOADED';
        sectionImageUrl = getFullImageUrl(auto.image_url);
      }
      // Previous week image = BUFFER
      else if (imageUtils.isPreviousWeek(auto.image_week_number, auto.image_year)) {
        section = 'BUFFER';
        sectionImageUrl = getFullImageUrl(auto.image_url);
      }
      // Any other old image = MISSING (never show old images)
      else {
        section = 'MISSING';
      }
      
      sections[section].push({
        id: auto.id,
        auto_no: auto.auto_no,
        owner_name: auto.owner_name,
        status: auto.status,
        image_url: sectionImageUrl, // ✅ NULL for MISSING, full URL for BUFFER/UPLOADED
        uploadedDate: auto.image_upload_date ? new Date(auto.image_upload_date).toLocaleDateString('en-IN') : null,
        weekNumber: auto.image_week_number,
        year: auto.image_year,
        section // Include section name
      });
    }
    
    console.log(`✓ Section breakdown (computed):`);
    console.log(`  UPLOADED (current week): ${sections.UPLOADED.length}`);
    console.log(`  BUFFER (previous week): ${sections.BUFFER.length}`);
    console.log(`  MISSING (no image or old): ${sections.MISSING.length}`);
    console.log(`  TOTAL: ${activeAutos.length}`);
    
    // Validate math
    const totalInSections = sections.MISSING.length + sections.BUFFER.length + sections.UPLOADED.length;
    if (totalInSections !== activeAutos.length) {
      console.error(`❌ Math error! ${totalInSections} != ${activeAutos.length}`);
    }
    
    res.json({
      summary: {
        total: activeAutos.length,
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
 * 
 * Stores ONLY:
 * - image_url
 * - image_upload_date
 * - image_week_number
 * - image_year
 * 
 * Do NOT store section status - sections are computed dynamically.
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
    
    // Verify auto exists
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
    
    // ✅ VERIFY FILE WAS ACTUALLY COPIED before continuing
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ERROR: File copy failed for ${fileName}`);
      throw new Error(`File was not successfully saved: ${fileName}`);
    }
    console.log(`✓ File verified on disk: ${filePath}`);
    
    // Clean up temp file
    await fsPromises.unlink(req.file.path).catch(() => {});
    
    // ✅ SAFE: Delete old image file if it exists
    if (auto.image_url) {
      const oldImagePath = path.join(__dirname, '../../', auto.image_url);
      try {
        if (fs.existsSync(oldImagePath)) {
          await fsPromises.unlink(oldImagePath);
          console.log(`✓ Old image file deleted: ${oldImagePath}`);
        }
      } catch (err) {
        console.warn(`⚠️  Could not delete old image file: ${oldImagePath}`, err.message);
      }
    }
    
    // Save image metadata to database with relative path
    const imageUrl = `/uploads/auto-images/${fileName}`;
    
    const updateResult = await db('autos')
      .where({ id })
      .update({
        image_url: imageUrl,
        image_upload_date: new Date(),
        image_week_number: currentWeek,
        image_year: currentYear,
        // ❌ NO image_status - sections are computed dynamically
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
        imageUrl: getFullImageUrl(imageUrl),
        uploadedDate: new Date().toLocaleDateString('en-IN'),
        weekNumber: currentWeek,
        year: currentYear,
        section: 'UPLOADED' // Computed section
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete auto image manually
 * 
 * Safely deletes:
 * 1. File from filesystem (with fs.existsSync check)
 * 2. Database image fields (reset to NULL)
 * 
 * Does NOT store section status - it will be computed as MISSING.
 */
exports.deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_id = req.admin?.id;
    
    console.log(`🗑️  Deleting image for auto ${id} (by admin ${admin_id})`);
    
    // Fetch auto
    const auto = await db('autos').where({ id }).first();
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }
    
    if (!auto.image_url) {
      return res.status(400).json({ error: 'Auto has no image to delete' });
    }
    
    // ✅ SAFE: Delete file from storage only if it exists
    const imagePath = path.join(__dirname, '../../', auto.image_url);
    try {
      if (fs.existsSync(imagePath)) {
        await fsPromises.unlink(imagePath);
        console.log(`✓ Image file deleted from disk: ${imagePath}`);
      } else {
        console.warn(`⚠️  Image file not found on disk: ${imagePath}`);
      }
    } catch (err) {
      console.warn(`⚠️  Error deleting image file: ${imagePath}`, err.message);
    }
    
    // ✅ RELIABLE: Clear all image metadata from database
    const updateResult = await db('autos')
      .where({ id })
      .update({
        image_url: null,
        image_upload_date: null,
        image_week_number: null,
        image_year: null,
        // ❌ NO image_status = 'MISSING' - section will be computed as MISSING
        updated_at: new Date(),
      });
    
    console.log(`✓ Image deleted for auto ${id} (File + DB cleared)`);
    console.log(`  Database update result: ${updateResult} rows affected`);
    
    res.json({
      message: 'Image deleted successfully',
      auto: {
        id,
        auto_no: auto.auto_no,
        section: 'MISSING' // Will be computed as MISSING on next fetch
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-delete images past Tuesday deadline (CRON JOB - Tuesday 23:59)
 * 
 * Runs when: Tuesday 23:59 (Asia/Kolkata)
 * Deletes: Images where image_week_number < current_week - 1
 * 
 * For each expired image:
 * 1. Delete file from filesystem
 * 2. Clear database image fields
 * 3. Log deletion clearly
 */
exports.autoDeleteExpiredImages = async () => {
  try {
    console.log('\n⏰ [CRON TASK] Auto-delete expired images (Tuesday 23:59)');
    
    const currentWeek = imageUtils.getCurrentWeekNumber();
    const currentYear = imageUtils.getCurrentYear();
    
    // Calculate cutoff: images older than previous week should be deleted
    // Example: if current_week = 10, delete images where week < 9
    let cutoffWeek = currentWeek - 1;
    let cutoffYear = currentYear;
    
    // Handle year boundary (Week 1)
    if (currentWeek === 1) {
      cutoffWeek = 53;
      cutoffYear = currentYear - 1;
    }
    
    console.log(`📊 Current: Week ${currentWeek}/${currentYear}, Cutoff: Week ${cutoffWeek}/${cutoffYear}`);
    console.log(`🔍 Searching for ACTIVE autos with expired images...`);
    
    // ✅ CRITICAL: Only query ACTIVE autos with images
    const autosWithImages = await db('autos')
      .where({ status: 'ACTIVE', deleted_at: null })
      .whereNotNull('image_url')
      .whereNotNull('image_week_number')
      .select('id', 'auto_no', 'image_url', 'image_week_number', 'image_year');
    
    console.log(`✓ Found ${autosWithImages.length} ACTIVE autos with images`);
    
    let deletedCount = 0;
    let skipCount = 0;
    
    for (const auto of autosWithImages) {
      // Determine if image is expired
      const weekNum = auto.image_week_number;
      const yearNum = auto.image_year;
      let isExpired = false;
      
      if (yearNum < cutoffYear) {
        // Image is from previous year
        isExpired = true;
      } else if (yearNum === cutoffYear && weekNum < cutoffWeek) {
        // Image is from this year but before cutoff week
        isExpired = true;
      }
      // If yearNum > cutoffYear, definitely not expired
      // If yearNum === cutoffYear && weekNum >= cutoffWeek, not expired
      
      if (!isExpired) {
        skipCount++;
        continue;
      }
      
      console.log(`  🗑️  [${auto.auto_no}] Week ${weekNum}/${yearNum} is expired, deleting...`);
      
      try {
        // ✅ SAFE: Delete file only if it exists
        const imagePath = path.join(__dirname, '../../', auto.image_url);
        if (fs.existsSync(imagePath)) {
          await fsPromises.unlink(imagePath);
          console.log(`    ✓ File deleted: ${auto.image_url}`);
        } else {
          console.warn(`    ⚠️  File not found (DB cleanup only): ${auto.image_url}`);
        }
        
        // ✅ RELIABLE: Clear database image fields
        await db('autos')
          .where({ id: auto.id })
          .update({
            image_url: null,
            image_upload_date: null,
            image_week_number: null,
            image_year: null,
            // ❌ NO image_status - section will be computed as MISSING
            updated_at: new Date(),
          });
        
        console.log(`    ✓ Database cleared for auto ${auto.auto_no}`);
        deletedCount++;
        
      } catch (err) {
        console.error(`    ❌ Error deleting for ${auto.auto_no}: ${err.message}`);
      }
    }
    
    console.log(`✅ Auto-delete completed:`);
    console.log(`  ✓ Deleted: ${deletedCount}`);
    console.log(`  ⊘ Skipped (not expired): ${skipCount}`);
    console.log(`  📊 Total checked: ${autosWithImages.length}\n`);
    
    return { deletedCount, skippedCount: skipCount, totalChecked: autosWithImages.length };
    
  } catch (error) {
    console.error('❌ Auto-delete error:', error.message);
    throw error;
  }
};

module.exports = exports;
