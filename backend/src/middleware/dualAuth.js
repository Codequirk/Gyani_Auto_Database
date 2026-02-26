const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Company = require('../models/Company');

/**
 * Dual Auth Middleware
 * Accepts BOTH admin tokens and company tokens
 * Sets either req.admin or req.company based on token type
 */
async function dualAuthMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check token type
    if (decoded.type === 'company') {
      // Company token
      const company = await Company.findById(decoded.id);
      if (!company) {
        return res.status(401).json({ error: 'Company not found - please login again' });
      }
      req.company = company;
      req.company_id = company.id;
      req.auth_type = 'company';
    } else {
      // Admin token (default)
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return res.status(401).json({ error: 'Admin not found - please login again' });
      }
      req.admin = admin;
      req.auth_type = 'admin';
    }

    next();
  } catch (error) {
    console.error('Dual auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = dualAuthMiddleware;
