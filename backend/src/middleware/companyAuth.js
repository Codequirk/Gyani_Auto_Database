const jwt = require('jsonwebtoken');
const Company = require('../models/Company');

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

    const company = await Company.findById(decoded.id);

    if (!company) {
      return res.status(401).json({ error: 'Company not found - please login again' });
    }

    req.company = company;
    req.company_id = company.id;
    next();
  } catch (error) {
    console.error('Company auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = companyAuthMiddleware;
