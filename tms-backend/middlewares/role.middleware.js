const { sendError } = require('../utils/apiResponse');
const { ROLES } = require('../config/constants');

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin') or authorize('admin', 'coordinator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated.');
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Role '${req.user.role}' is not authorized for this action.`
      );
    }
    next();
  };
};

// Convenience role middlewares
const adminOnly = authorize(ROLES.ADMIN);
const coordinatorOnly = authorize(ROLES.COORDINATOR);
const studentOnly = authorize(ROLES.STUDENT);
const adminOrCoordinator = authorize(ROLES.ADMIN, ROLES.COORDINATOR);
const adminOrStudent = authorize(ROLES.ADMIN, ROLES.STUDENT);
const allRoles = authorize(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.STUDENT);

module.exports = {
  authorize,
  adminOnly,
  coordinatorOnly,
  studentOnly,
  adminOrCoordinator,
  adminOrStudent,
  allRoles,
};
