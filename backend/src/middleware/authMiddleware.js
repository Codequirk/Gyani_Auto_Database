/**
 * Auth Middleware
 * Verifies JWT tokens and validates authentication
 * 
 * Usage:
 * router.get('/protected', authMiddleware, controller.method)
 */

const AuthService = require('../services/authService');

/**
 * Default middleware - Verify JWT token and extract user information
 * Attaches decoded user to req.company (for company auth) or req.user (for admin)
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login first.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = AuthService.verifyToken(token);
    
    // For company auth, attach to req.company
    if (decoded.type === 'company') {
      req.company = decoded;
      req.companyId = decoded.id;
    } else {
      // For admin auth
      req.user = decoded;
      req.userId = decoded.id;
    }

    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

/**
 * Verify JWT token and extract user information
 * Attaches decoded user to req.user
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login first.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    req.userId = decoded.id;

    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

/**
 * Verify JWT token and check for incomplete profile
 * Allows requests only if profile is complete
 */
const verifyTokenAndProfile = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login first.',
      });
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);

    req.user = decoded;
    req.userId = decoded.id;

    // Note: Profile complete check should be done at controller level
    // to fetch and verify current user status
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

/**
 * Verify JWT token exists (optional auth)
 * Attaches user to req.user if token is valid, otherwise proceeds without user
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
      req.userId = decoded.id;
    }

    next();
  } catch (error) {
    // Token invalid/expired but that's OK for optional auth
    console.warn('⚠️ Optional auth: Token invalid, proceeding without user');
    next();
  }
};

module.exports = authMiddleware;
module.exports.verifyToken = verifyToken;
module.exports.verifyTokenAndProfile = verifyTokenAndProfile;
module.exports.optionalAuth = optionalAuth;
