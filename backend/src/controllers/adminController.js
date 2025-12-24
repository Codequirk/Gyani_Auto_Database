const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

exports.listAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.findAll();
    res.json(admins);
  } catch (error) {
    next(error);
  }
};

exports.getAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    next(error);
  }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role = 'ADMIN' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await Admin.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await Admin.create({
      name,
      email,
      password_hash: hashedPassword,
      role,
      updated_by_admin_id: req.admin.id,
    });

    res.status(201).json(admin);
  } catch (error) {
    next(error);
  }
};

exports.updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const updateData = {
      ...(name && { name }),
      ...(role && { role }),
      updated_by_admin_id: req.admin.id,
    };

    if (email && email !== admin.email) {
      const existing = await Admin.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      updateData.email = email;
    }

    const updated = await Admin.update(id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.admin.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    await Admin.softDelete(id, req.admin.id);
    res.json({ message: 'Admin deleted' });
  } catch (error) {
    next(error);
  }
};
