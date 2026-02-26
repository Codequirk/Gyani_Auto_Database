const jwt = require('jsonwebtoken');
const Company = require('../models/Company');

async function companyAuthMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('[COMPANY-AUTH-MIDDLEWARE] No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.log('[COMPANY-AUTH-MIDDLEWARE] Invalid or expired token:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('[COMPANY-AUTH-MIDDLEWARE] Token decoded:', { type: decoded.type, user_id: decoded.user_id, company_id: decoded.company_id });

    // Check if token is for company
    if (decoded.type !== 'company') {
      console.log('[COMPANY-AUTH-MIDDLEWARE] Token is not for company, type is:', decoded.type);
      return res.status(403).json({ error: 'This token is not for company access' });
    }

    // Use company_id from token (new structure) or id (old structure for backward compatibility)
    const companyId = decoded.company_id || decoded.id;
    
    if (!companyId) {
      console.log('[COMPANY-AUTH-MIDDLEWARE] No company_id or id in token');
      return res.status(401).json({ error: 'Invalid token - no company ID' });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      console.log('[COMPANY-AUTH-MIDDLEWARE] Company not found with ID:', companyId);
      return res.status(401).json({ error: 'Company not found - please login again' });
    }

    console.log('[COMPANY-AUTH-MIDDLEWARE] Company authenticated:', company.id);
    
    req.company = company;
    req.company_id = company.id;
    req.user_id = decoded.user_id;
    next();
  } catch (error) {
    console.error('[COMPANY-AUTH-MIDDLEWARE] Unexpected error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = companyAuthMiddleware;
