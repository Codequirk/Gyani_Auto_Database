const path = require('path');
const fs = require('fs');
const AutoAdvertisement = require('../models/AutoAdvertisement');
const Auto = require('../models/Auto');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/advertisements');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Convert relative image paths to full URLs using BASE_URL
 * This ensures images are accessible from any domain (admin.*, api.*, etc.)
 */
const getFullImageUrl = (relativePath) => {
  if (!relativePath) return null;
  
  // If it's already a full URL, return as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Get BASE_URL from environment (should be the API backend URL)
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  
  return `${baseUrl}/${cleanPath}`;
};

exports.uploadAdvertisement = async (req, res, next) => {
  try {
    const { autoId, companyId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log(`[AD-UPLOAD] Uploading advertisement for auto=${autoId}, company=${companyId}`);
    console.log(`[AD-UPLOAD] File details: name=${req.file.filename}, size=${req.file.size}, path=${req.file.path}`);

    // Validate file type - PNG only
    if (req.file.mimetype !== 'image/png') {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      console.log(`[AD-UPLOAD] ❌ Invalid MIME type: ${req.file.mimetype}`);
      return res.status(400).json({ message: 'Only PNG files are allowed' });
    }

    // Validate auto exists and is ACTIVE
    const auto = await Auto.findById(autoId);
    if (!auto) {
      fs.unlinkSync(req.file.path);
      console.log(`[AD-UPLOAD] ❌ Auto not found: ${autoId}`);
      return res.status(404).json({ message: 'Auto not found' });
    }

    if (auto.status !== 'ACTIVE') {
      fs.unlinkSync(req.file.path);
      console.log(`[AD-UPLOAD] ❌ Auto status not ACTIVE: ${auto.status}`);
      return res.status(400).json({ message: 'Only ACTIVE autos can have advertisements' });
    }

    // Delete existing advertisement for this auto-company pair
    const existing = await AutoAdvertisement.findByAutoAndCompany(autoId, companyId);
    if (existing) {
      const oldPath = path.join(__dirname, '../../', existing.image_path);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log(`[AD-UPLOAD] Deleted old advertisement: ${oldPath}`);
      }
      await AutoAdvertisement.deleteByAutoAndCompany(autoId, companyId);
    }

    // Create advertisement record
    const imagePath = `uploads/advertisements/${req.file.filename}`;
    const advertisement = await AutoAdvertisement.create(autoId, companyId, imagePath, req.file.filename);

    console.log(`[AD-UPLOAD] ✓ Advertisement saved. Path: ${imagePath}`);
    console.log(`[AD-UPLOAD] ✓ Full URL: ${getFullImageUrl(imagePath)}`);

    res.status(201).json({
      message: 'Advertisement uploaded successfully',
      advertisement: {
        ...advertisement,
        image_path: getFullImageUrl(imagePath),
        image_url: getFullImageUrl(imagePath)
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error(`[AD-UPLOAD] ❌ Error:`, error.message);
    next(error);
  }
};

exports.getAdvertisement = async (req, res, next) => {
  try {
    const { autoId, companyId } = req.params;

    const advertisement = await AutoAdvertisement.findByAutoAndCompany(autoId, companyId);
    if (!advertisement) {
      return res.status(404).json({ message: 'No advertisement found' });
    }

    // Convert relative image path to full URL for frontend consumption
    const advertisementWithFullUrl = {
      ...advertisement,
      image_path: getFullImageUrl(advertisement.image_path),
      image_url: getFullImageUrl(advertisement.image_path) // Also return as image_url for compatibility
    };

    res.json(advertisementWithFullUrl);
  } catch (error) {
    next(error);
  }
};

exports.getAdvertisementImage = async (req, res, next) => {
  try {
    const { autoId, companyId } = req.params;

    console.log(`[AD-IMAGE] Fetching image for auto=${autoId}, company=${companyId}`);

    const advertisement = await AutoAdvertisement.findByAutoAndCompany(autoId, companyId);
    if (!advertisement) {
      console.log(`[AD-IMAGE] ❌ No advertisement found for auto=${autoId}, company=${companyId}`);
      return res.status(404).json({ message: 'No advertisement found' });
    }

    const imagePath = path.join(__dirname, '../../', advertisement.image_path);
    console.log(`[AD-IMAGE] Advertisement image_path from DB: ${advertisement.image_path}`);
    console.log(`[AD-IMAGE] Resolved full path: ${imagePath}`);
    console.log(`[AD-IMAGE] File exists: ${fs.existsSync(imagePath)}`);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`[AD-IMAGE] ❌ Image file not found at path: ${imagePath}`);
      return res.status(404).json({ message: 'Image file not found' });
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'image/png');
    
    console.log(`[AD-IMAGE] ✓ Streaming image to client`);
    fs.createReadStream(imagePath).pipe(res);
  } catch (error) {
    console.error(`[AD-IMAGE] ❌ Error:`, error.message);
    next(error);
  }
};

exports.deleteAdvertisement = async (req, res, next) => {
  try {
    const { autoId, companyId } = req.params;

    const advertisement = await AutoAdvertisement.findByAutoAndCompany(autoId, companyId);
    if (!advertisement) {
      return res.status(404).json({ message: 'No advertisement found' });
    }

    // Delete physical file
    const imagePath = path.join(__dirname, '../../', advertisement.image_path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Soft delete database record
    await AutoAdvertisement.deleteByAutoAndCompany(autoId, companyId);

    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAdvertisementByAuto = async (req, res, next) => {
  try {
    const { autoId } = req.params;

    const advertisements = await AutoAdvertisement.getByAutoId(autoId);
    
    // Delete all physical files
    for (const ad of advertisements) {
      const imagePath = path.join(__dirname, '../../', ad.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Soft delete all database records
    await AutoAdvertisement.deleteByAuto(autoId);

    res.json({ message: 'All advertisements deleted successfully' });
  } catch (error) {
    next(error);
  }
};
