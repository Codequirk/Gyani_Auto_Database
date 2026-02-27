const Company = require('../models/Company');
const CompanyUser = require('../models/CompanyUser');
const Assignment = require('../models/Assignment');
const bcrypt = require('bcryptjs');

exports.listCompanies = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filters = {};

    if (search) {
      filters.search = search;
      console.log('[COMPANY-LIST] Searching for companies with term:', search);
    }
    if (status) {
      filters.status = status;
    }

    const companies = await Company.findAll(filters);
    
    if (search) {
      console.log(`[COMPANY-LIST] ✓ Found ${companies.length} companies matching "${search}"`);
      if (companies.length > 0) {
        console.log('[COMPANY-LIST] Results:', companies.map(c => ({ name: c.name, email: c.email })));
      }
    } else {
      console.log(`[COMPANY-LIST] ✓ Retrieved ${companies.length} active companies`);
    }
    
    res.json(companies);
  } catch (error) {
    console.error('[COMPANY-LIST] ❌ Error fetching companies:', error.message);
    next(error);
  }
};

exports.getCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await Company.getWithAssignments(id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    next(error);
  }
};

exports.createCompany = async (req, res, next) => {
  try {
    const { name, contact_person, emails, phone_numbers, password, status } = req.body;

    console.log('\n========== [COMPANY-CREATE] START ==========');
    console.log('[COMPANY-CREATE] Received data:', {
      name,
      contact_person,
      emails: emails,
      phone_numbers: phone_numbers,
      password_length: password ? password.length : 0,
      status,
    });

    if (!name || !contact_person || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: name, contact_person, and at least one email are required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters' });
    }

    // Check if email already exists in companies table
    const normalizedEmails = emails.map(e => e.toLowerCase().trim());
    for (const email of normalizedEmails) {
      const existing = await Company.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: `Email ${email} already exists in companies` });
      }
      
      // Also check if email already exists in company_users
      const existingUser = await CompanyUser.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: `Email ${email} already exists in company users` });
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('[COMPANY-CREATE] ✓ Password hashed successfully');

    const company = await Company.create({
      name,
      contact_person,
      email: normalizedEmails[0],
      emails: JSON.stringify(normalizedEmails),
      phone_numbers: JSON.stringify(phone_numbers || []),
      password_hash: hashedPassword,
      required_autos: 0,
      area_id: null,
      days_requested: 0,
      status: status || 'ACTIVE',
      company_status: 'ACTIVE',
      created_by_admin_id: req.admin?.id || null,
    });

    console.log('[COMPANY-CREATE] ✓ Company created:', { id: company.id, email: company.email, has_password_hash: !!company.password_hash });

    // Auto-create corresponding company_users entry for login
    try {
      const newUser = await CompanyUser.create({
        email: normalizedEmails[0],
        password: hashedPassword, // Store hashed password
        company_name: name,
        phone_number: phone_numbers?.[0] || null,
        company_person: contact_person,
        is_verified: true, // Admin-created companies are pre-verified
      });
      console.log('[COMPANY-CREATE] ✓ CompanyUser entry created for:', normalizedEmails[0], 'with ID:', newUser?.id);
    } catch (userError) {
      console.error('[COMPANY-CREATE] ❌ CompanyUser creation error:', userError.message);
      console.error('[COMPANY-CREATE] Error details:', userError);
      // Don't fail the entire company creation, but log it
      return res.status(500).json({ 
        error: 'Company created but authentication setup failed', 
        details: userError.message 
      });
    }

    res.status(201).json({ ...company, message: 'Company and authentication credentials created successfully' });
  } catch (error) {
    console.error('[COMPANY-CREATE] ❌ Error creating company:', error.message);
    console.error('[COMPANY-CREATE] Full error:', error);
    res.status(500).json({ error: error.message || 'Failed to create company' });
  }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact_person, emails, phone_numbers, required_autos, days_requested, status } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (contact_person) updateData.contact_person = contact_person;
    if (emails && emails.length > 0) {
      const normalizedEmails = emails.map(e => e.toLowerCase().trim());
      updateData.email = normalizedEmails[0];
      updateData.emails = JSON.stringify(normalizedEmails);
    }
    if (phone_numbers) updateData.phone_numbers = JSON.stringify(phone_numbers);
    // Password editing removed - passwords cannot be changed through edit
    if (required_autos) updateData.required_autos = required_autos;
    if (days_requested) updateData.days_requested = days_requested;
    if (status) updateData.status = status;

    const updated = await Company.update(id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete any assignments for this company first
    await Assignment.deleteByCompanyId(id);

    // Then delete the company
    await Company.softDelete(id);
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Only REQUESTED companies can be approved' });
    }

    const updated = await Company.update(id, {
      status: 'ACTIVE',
      company_status: 'ACTIVE',
      updated_at: new Date(),
    });

    res.json({
      message: 'Company approved successfully',
      company: updated,
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Only REQUESTED companies can be rejected' });
    }

    const updated = await Company.update(id, {
      status: 'REJECTED',
      company_status: 'REJECTED',
      rejection_reason: reason || 'Rejected by admin',
      updated_at: new Date(),
    });

    res.json({
      message: 'Company rejected successfully',
      company: updated,
    });
  } catch (error) {
    next(error);
  }
};
