/**
 * Auto Portal Authentication Routes
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Auto = require('../models/Auto');
const db = require('../models/db');

/**
 * POST /login
 * Auto driver login with auto_no and driver_phone
 * Case-insensitive auto_no, flexible phone matching (10-digit or with 91+ prefix)
 */
router.post('/login', async (req, res, next) => {
  try {
    const { auto_no, driver_phone } = req.body;

    // Validation
    if (!auto_no || !driver_phone) {
      return res.status(400).json({ 
        error: 'Auto number and driver phone are required' 
      });
    }

    console.log('[AUTO-AUTH] Login attempt:', { auto_no, driver_phone });

    // Extract 10-digit phone number
    let normalizedPhone = driver_phone.toString().replace(/\D/g, '');
    
    // Remove leading 91 if present (India country code)
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
      normalizedPhone = normalizedPhone.substring(2);
    }

    // Ensure it's 10 digits
    if (normalizedPhone.length !== 10) {
      return res.status(400).json({ 
        error: 'Please enter a valid 10-digit phone number' 
      });
    }

    console.log('[AUTO-AUTH] Normalized phone:', normalizedPhone);

    // Find auto with case-insensitive auto_no using database query
    const auto = await db('autos')
      .where(db.raw('LOWER(auto_no) = ?', [auto_no.toLowerCase()]))
      .where({ deleted_at: null })
      .first();

    if (!auto) {
      console.log('[AUTO-AUTH] Auto not found:', auto_no);
      return res.status(401).json({ 
        error: 'Auto number not found' 
      });
    }

    console.log('[AUTO-AUTH] Auto found:', auto.auto_no);

    // Validate driver phone
    let autoPhone = auto.driver_phone.toString().replace(/\D/g, '');
    
    // Remove leading 91 if present
    if (autoPhone.startsWith('91') && autoPhone.length === 12) {
      autoPhone = autoPhone.substring(2);
    }

    console.log('[AUTO-AUTH] Auto phone (normalized):', autoPhone, 'Provided phone:', normalizedPhone);

    if (autoPhone !== normalizedPhone) {
      console.log('[AUTO-AUTH] Phone mismatch');
      return res.status(401).json({ 
        error: 'Invalid phone number for this auto' 
      });
    }

    console.log('[AUTO-AUTH] Phone match - generating token');

    // Generate JWT token with type 'auto'
    const token = jwt.sign(
      {
        type: 'auto',
        auto_id: auto.id,
        auto_no: auto.auto_no,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('[AUTO-AUTH] Login successful for auto:', auto.auto_no);

    res.json({
      token,
      auto: {
        id: auto.id,
        auto_no: auto.auto_no,
        owner_name: auto.owner_name,
        driver_phone: auto.driver_phone,
        image_url: auto.image_url || null,
        image_upload_date: auto.image_upload_date || null,
      },
    });
  } catch (error) {
    console.error('[AUTO-AUTH] Login error:', error);
    next(error);
  }
});

module.exports = router;
