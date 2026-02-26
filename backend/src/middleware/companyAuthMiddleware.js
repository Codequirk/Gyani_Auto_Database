/**
 * Company Auth Middleware
 * Validates company_auth_token JWT and populates req.company
 */

const jwt = require('jsonwebtoken');
const CompanyUser = require('../models/CompanyUser');

async function companyAuthMiddleware(req, res, next) {
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

    // Check if token is for company
    if (decoded.type !== 'company') {
      return res.status(403).json({ error: 'This token is not for company access' });
    }

    // Find company user by ID
    const companyUser = await CompanyUser.findById(decoded.user_id);

    if (!companyUser) {
      return res.status(401).json({ error: 'Company user not found - please login again' });
    }

    req.company = companyUser;
    req.company_id = companyUser.id;
    req.auth_type = 'company';
    next();
  } catch (error) {
    console.error('Company auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = companyAuthMiddleware;
