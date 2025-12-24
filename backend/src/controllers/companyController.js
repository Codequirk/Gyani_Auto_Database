const Company = require('../models/Company');

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
    const { name, contact_person, emails, phone_numbers, status } = req.body;

    if (!name || !contact_person || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: name, contact_person, and at least one email are required' });
    }

    const company = await Company.create({
      name,
      contact_person,
      emails: emails,
      phone_numbers: phone_numbers || [],
      required_autos: 0,
      area_id: 'default',
      days_requested: 0,
      status: status || 'ACTIVE',
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
    const { name, required_autos, days_requested, status } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
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

    await Company.softDelete(id);
    res.json({ message: 'Company deleted' });
  } catch (error) {
    next(error);
  }
};
