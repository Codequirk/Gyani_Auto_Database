const path = require('path');
const fs = require('fs');
const AutoAdvertisement = require('../models/AutoAdvertisement');
const Auto = require('../models/Auto');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/advertisements');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

exports.uploadAdvertisement = async (req, res, next) => {
  try {
    const { autoId, companyId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file type - PNG only
    if (req.file.mimetype !== 'image/png') {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Only PNG files are allowed' });
    }

    // Validate auto exists and is ACTIVE
    const auto = await Auto.findById(autoId);
    if (!auto) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Auto not found' });
    }

    if (auto.status !== 'ACTIVE') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Only ACTIVE autos can have advertisements' });
    }

    // Delete existing advertisement for this auto-company pair
    const existing = await AutoAdvertisement.findByAutoAndCompany(autoId, companyId);
    if (existing) {
      const oldPath = path.join(__dirname, '../../', existing.image_path);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      await AutoAdvertisement.deleteByAutoAndCompany(autoId, companyId);
    }

    // Create advertisement record
    const imagePath = `uploads/advertisements/${req.file.filename}`;
    const advertisement = await AutoAdvertisement.create(autoId, companyId, imagePath, req.file.filename);

    res.status(201).json({
      message: 'Advertisement uploaded successfully',
      advertisement
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

    res.json(advertisement);
  } catch (error) {
    next(error);
  }
};

exports.getAdvertisementImage = async (req, res, next) => {
  try {
    const { autoId, companyId } = req.params;

    const advertisement = await AutoAdvertisement.findByAutoAndCompany(autoId, companyId);
    if (!advertisement) {
      return res.status(404).json({ message: 'No advertisement found' });
    }

    const imagePath = path.join(__dirname, '../../', advertisement.image_path);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ message: 'Image file not found' });
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'image/png');
    
    fs.createReadStream(imagePath).pipe(res);
  } catch (error) {
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
