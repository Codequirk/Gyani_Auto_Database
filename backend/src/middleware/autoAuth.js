const jwt = require('jsonwebtoken');
const Auto = require('../models/Auto');

/**
 * Auto Auth Middleware
 * Validates auto_auth_token and finds auto by ID
 * Sets req.auto and req.auth_type = 'auto'
 */
async function autoAuthMiddleware(req, res, next) {
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

    // Check if token is for auto
    if (decoded.type !== 'auto') {
      return res.status(403).json({ error: 'This token is not for auto access' });
    }

    // Find auto by ID
    const auto = await Auto.findById(decoded.auto_id);

    if (!auto) {
      return res.status(401).json({ error: 'Auto not found - please login again' });
    }

    req.auto = auto;
    req.auto_id = auto.id;
    req.auth_type = 'auto';
    next();
  } catch (error) {
    console.error('Auto auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = autoAuthMiddleware;
