const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/apiResponse');
const { JWT_COOKIE_NAME } = require('../config/constants');

/**
 * Authentication Middleware
 * Verifies JWT from HttpOnly cookie.
 * Attaches decoded user payload to req.user.
 */
const protect = (req, res, next) => {
  try {
    // Read token from HttpOnly cookie
    const token = req.cookies[JWT_COOKIE_NAME];

    if (!token) {
      return sendError(res, 401, 'Not authenticated. Please log in.');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, name, username }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Session expired. Please log in again.');
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token. Please log in again.');
    }
    return sendError(res, 401, 'Authentication failed.');
  }
};

/**
 * Generate JWT and set it as HttpOnly cookie.
 */
const generateTokenAndSetCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd || process.env.COOKIE_SECURE === 'true',
    sameSite: 'Lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
  });

  return token;
};

/**
 * Clear JWT cookie on logout.
 */
const clearTokenCookie = (res) => {
  res.cookie(JWT_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    expires: new Date(0),
  });
};

module.exports = { protect, generateTokenAndSetCookie, clearTokenCookie };
