/**
 * Audit Middleware - Attaches audit context to requests
 * 
 * Extracts user information and makes it available throughout the request lifecycle
 */

const { getAuditContext } = require('../utils/auditUtils');

/**
 * Middleware to attach audit context to request
 * Should be placed early in middleware chain
 */
const auditMiddleware = (req, res, next) => {
  try {
    // Get audit context (user ID, timestamp, IP, user agent)
    const auditContext = getAuditContext(req);
    
    // Attach to request object for use in controllers
    req.auditContext = auditContext;
    
    // Also attach convenience method
    req.getAuditContext = () => auditContext;
    
    next();
  } catch (error) {
    console.error('Error in audit middleware:', error);
    // Don't fail request - audit middleware should never break the app
    next();
  }
};

module.exports = auditMiddleware;
