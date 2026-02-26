/**
 * Company Portal Authentication Controller
 * Handles: Registration OTP, Email verification, Profile completion, Login, Google OAuth, Password Reset
 */

const jwt = require('jsonwebtoken');
const db = require('../models/db');
const CompanyUser = require('../models/CompanyUser');
const OTPUtils = require('../utils/otpUtils');
const EmailUtils = require('../utils/emailUtils');
const PasswordUtils = require('../utils/passwordUtils');

exports.registerCompany = async (req, res, next) => {
  try {
    const { name, email, password, contact_person, phone_number, autos_required, days_required, start_date, area_id } = req.body;

    if (!name || !email || !password || !contact_person) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if company already exists
    const existing = await Company.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Company email already exists' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    
    // Get area name if area_id provided
    let areaName = 'Any Area';
    if (area_id) {
      try {
        const area = await Area.findById(area_id);
        if (area) {
          areaName = area.name;
        }
      } catch (e) {
        // Area not found, use default
      }
    }
    
    // Create company with PENDING_APPROVAL status
    const company = await Company.create({
      name,
      email: normalizedEmail,
      password_hash: hashedPassword,
      contact_person,
      phone_number: phone_number || '',
      emails: JSON.stringify([normalizedEmail]),
      phone_numbers: JSON.stringify(phone_number ? [phone_number] : []),
      required_autos: parseInt(autos_required) || 0,
      area_id: area_id || null,
      days_requested: 0,
      status: 'INACTIVE',
      company_status: 'PENDING_APPROVAL',
      created_by_admin_id: null,
    });

    // Create initial ticket for this company - ALWAYS create one
    // If optional fields provided, use them; otherwise use defaults
    await CompanyTicket.create({
      company_id: company.id,
      autos_required: parseInt(autos_required) || 0,
      days_required: parseInt(days_required) || 0,
      start_date: start_date ? new Date(start_date) : new Date(),
      area_id: area_id || null,
      area_name: areaName,
      ticket_status: 'PENDING',
      notes: `Initial registration request - ${name}`,
    });

    const token = jwt.sign(
      { id: company.id, email: company.email, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    res.status(201).json({
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        contact_person: company.contact_person,
        phone_number: company.phone_number,
        status: company.company_status,
      },
      token,
      message: 'Registration successful. Please wait for admin approval.',
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ error: `A company with this ${field} already exists` });
    }
    next(error);
  }
};

exports.loginCompany = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const company = await Company.findByEmail(normalizedEmail);
    if (!company) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcryptjs.compare(password, company.password_hash || '');
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (company.company_status === 'REJECTED') {
      return res.status(403).json({ error: 'Your registration has been rejected by admin' });
    }

    const token = jwt.sign(
      { id: company.id, email: company.email, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    res.json({
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        contact_person: company.contact_person,
        phone_number: company.phone_number,
        status: company.company_status,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.googleCallback = async (req, res, next) => {
  try {
    const company = req.user;

    if (!company) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Check if profile is complete
    if (!company.is_profile_complete) {
      // Store company data in session-like manner for profile completion
      const token = jwt.sign(
        { id: company.id, email: company.email, type: 'company' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // Shorter expiry for incomplete profile
      );

      // Redirect to frontend with token - frontend will handle profile completion flow
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/complete-profile?token=${token}&email=${encodeURIComponent(company.email)}&name=${encodeURIComponent(company.contact_person || '')}`
      );
    }

    // Profile complete, generate full access token
    const token = jwt.sign(
      { id: company.id, email: company.email, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // Redirect to dashboard with token
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/company-dashboard?token=${token}`);
  } catch (error) {
    console.error('❌ Google callback error:', error);
    next(error);
  }
};

exports.completeProfile = async (req, res, next) => {
  try {
    const { name, phone_number } = req.body;
    const company = req.company; // From authMiddleware

    if (!company) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !phone_number) {
      return res.status(400).json({ error: 'Name and phone number are required' });
    }

    // Update company profile
    await Company.update(company.id, {
      name,
      phone_number,
      is_profile_complete: true,
      company_status: 'PENDING_APPROVAL', // New Google users start as pending
      contact_person: name, // Use provided name as contact person
    });

    // Create initial ticket for this company (like in registration)
    try {
      await CompanyTicket.create({
        company_id: company.id,
        autos_required: 0,
        days_required: 0,
        start_date: new Date(),
        area_id: null,
        area_name: 'Any Area',
        ticket_status: 'PENDING',
        notes: `Initial registration request - ${name}`,
      });
    } catch (e) {
      console.error('Warning: Could not create initial ticket:', e.message);
      // Don't fail the entire profile completion if ticket creation fails
    }

    // Generate new full access token
    const token = jwt.sign(
      { id: company.id, email: company.email, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    const updatedCompany = await Company.findById(company.id);

    res.json({
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        email: updatedCompany.email,
        contact_person: updatedCompany.contact_person,
        phone_number: updatedCompany.phone_number,
        status: updatedCompany.company_status,
      },
      token,
      message: 'Profile completed successfully',
    });
  } catch (error) {
    console.error('❌ Complete profile error:', error);
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const company = req.company; // From authMiddleware

    if (!company) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fullCompany = await Company.findById(company.id);

    res.json({
      company: {
        id: fullCompany.id,
        name: fullCompany.name,
        email: fullCompany.email,
        contact_person: fullCompany.contact_person,
        phone_number: fullCompany.phone_number,
        status: fullCompany.company_status,
        auth_provider: fullCompany.auth_provider,
        is_profile_complete: fullCompany.is_profile_complete,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const company = req.company; // From authMiddleware

    if (!company) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = jwt.sign(
      { id: company.id, email: company.email, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
};

exports.googleTokenExchange = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'No credential provided' });
    }

    // Decode the JWT credential from Google (without verification for now)
    // In production, you should verify the signature with Google's public keys
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid credential format' });
    }

    // Decode payload (parts[1])
    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    const email = decoded.email;
    const googleId = decoded.sub;
    const displayName = decoded.name || '';

    // Check if company exists by google_id
    let company = await Company.findByGoogleId(googleId);

    if (company) {
      // Company exists, update last login
      await Company.update(company.id, {
        updated_at: new Date(),
      });
      
      // Check if profile is complete
      if (!company.is_profile_complete) {
        const tempToken = jwt.sign(
          { id: company.id, email: company.email, type: 'company' },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        return res.json({
          company: {
            id: company.id,
            email: company.email,
            name: company.name,
          },
          token: tempToken,
          redirectTo: '/complete-profile',
          message: 'Please complete your profile',
        });
      }

      // Profile complete, generate full token
      const fullToken = jwt.sign(
        { id: company.id, email: company.email, type: 'company' },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      return res.json({
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          contact_person: company.contact_person,
          phone_number: company.phone_number,
          status: company.company_status,
        },
        token: fullToken,
      });
    }

    // Check if email already exists (local auth user)
    company = await Company.findByEmail(email);

    if (company && company.auth_provider === 'local') {
      return res.status(409).json({
        error: 'This email is already registered with password authentication. Please login with your password.',
      });
    }

    // Create new company from Google profile
    company = await Company.create({
      name: displayName || 'New Company',
      email,
      google_id: googleId,
      auth_provider: 'google',
      is_profile_complete: false,
      company_status: 'PENDING_APPROVAL',
      status: 'INACTIVE',
      contact_person: displayName || 'Not Provided',
      password_hash: null, // Google users don't have passwords
    });

    // Generate temporary token for profile completion
    const tempToken = jwt.sign(
      { id: company.id, email: company.email, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      company: {
        id: company.id,
        email: company.email,
        name: company.name,
      },
      token: tempToken,
      redirectTo: '/complete-profile',
      message: 'Please complete your profile to continue',
    });
  } catch (error) {
    console.error('❌ Google token handler error:', error);
    next(error);
  }
};

exports.googleTokenExchange = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential' });
    }

    // Decode and verify the JWT credential from Google (we trust Google's signature)
    // In production, you should verify the signature against Google's public keys
    const decoded = jwt.decode(credential);

    if (!decoded || !decoded.email) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    const email = decoded.email;
    const googleId = decoded.sub;
    const displayName = decoded.name || '';

    // Check if company exists by google_id first
    let company = await Company.findByGoogleId(googleId);

    if (company) {
      // Company exists with Google login
      if (!company.is_profile_complete) {
        // Profile not complete, ask to complete it
        const token = jwt.sign(
          { id: company.id, email: company.email, type: 'company' },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        return res.json({
          token,
          email: company.email,
          name: company.contact_person || '',
          redirectTo: '/complete-profile',
        });
      }

      // Profile complete, generate full token
      const token = jwt.sign(
        { id: company.id, email: company.email, type: 'company' },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      return res.json({
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          contact_person: company.contact_person,
          phone_number: company.phone_number,
          status: company.company_status,
        },
        token,
      });
    }

    // Check if email already exists with local auth
    company = await Company.findByEmail(email);

    if (company && company.auth_provider === 'local') {
      // Email exists with password auth - cannot auto-link
      return res.status(409).json({
        error: 'This email is already registered with password authentication. Please login with your password.',
      });
    }

    // Create new Google company
    company = await Company.create({
      email,
      google_id: googleId,
      name: displayName || 'New Company',
      contact_person: displayName || 'Contact',
      auth_provider: 'google',
      is_profile_complete: false,
      company_status: 'INACTIVE',
      status: 'INACTIVE',
    });

    // Generate token for profile completion
    const token = jwt.sign(
      { id: company.id, email: company.email, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      email: company.email,
      name: company.contact_person,
      redirectTo: '/complete-profile',
    });
  } catch (error) {
    console.error('❌ Google token exchange error:', error);
    next(error);
  }
};
