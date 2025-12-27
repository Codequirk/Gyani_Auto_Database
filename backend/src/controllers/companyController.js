const Company = require('../models/Company');
const Assignment = require('../models/Assignment');
const bcrypt = require('bcryptjs');

exports.listCompanies = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filters = {};

    if (search) filters.search = search;
    if (status) filters.status = status;

    const companies = await Company.findAll(filters);
    res.json(companies);
  } catch (error) {
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

    if (!name || !contact_person || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: name, contact_person, and at least one email are required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters' });
    }

    // Check if email already exists
    const normalizedEmails = emails.map(e => e.toLowerCase().trim());
    for (const email of normalizedEmails) {
      const existing = await Company.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: `Email ${email} already exists` });
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const company = await Company.create({
      name,
      contact_person,
      email: normalizedEmails[0],
      emails: normalizedEmails,
      phone_numbers: phone_numbers || [],
      password_hash: hashedPassword,
      required_autos: 0,
      area_id: 'default',
      days_requested: 0,
      status: status || 'ACTIVE',
      company_status: 'ACTIVE',
      created_by_admin_id: req.admin?.id || 'system',
    });

    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact_person, emails, phone_numbers, password, required_autos, days_requested, status } = req.body;

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
      updateData.emails = normalizedEmails;
    }
    if (phone_numbers) updateData.phone_numbers = phone_numbers;
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      // Hash the new password
      updateData.password_hash = await bcrypt.hash(password, 10);
    }
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
