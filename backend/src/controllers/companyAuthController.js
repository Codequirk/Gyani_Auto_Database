const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Area = require('../models/Area');
const CompanyTicket = require('../models/CompanyTicket');
const { v4: uuidv4 } = require('uuid');

const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

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

    const hashedPassword = await bcrypt.hash(password, 10);
    
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
      emails: [normalizedEmail],
      phone_numbers: phone_number ? [phone_number] : [],
      required_autos: parseInt(autos_required) || 0,
      area_id: area_id || 'default',
      days_requested: 0,
      status: 'INACTIVE',
      company_status: 'PENDING_APPROVAL',
      created_by_admin_id: 'system_company_registration',
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

    const passwordMatch = await bcrypt.compare(password, company.password_hash || '');
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
