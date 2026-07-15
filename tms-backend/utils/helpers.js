const AuditLog = require('../models/AuditLog.model');

/**
 * Creates an audit log entry.
 * @param {Object} params
 * @param {string} params.action - Audit action (from AUDIT_ACTIONS constants)
 * @param {string} params.entity - Entity name (from AUDIT_ENTITIES constants)
 * @param {string} params.entityId - MongoDB ObjectId of the affected document
 * @param {Object} params.performedBy - { _id, name, role } of the actor
 * @param {string} params.ipAddress - IP address from req.ip
 * @param {Object} [params.previousData] - Previous values (for updates)
 * @param {Object} [params.newData] - New values
 * @param {string} [params.description] - Human-readable description
 */
const createAuditLog = async ({
  action,
  entity,
  entityId,
  performedBy,
  ipAddress,
  previousData = null,
  newData = null,
  description = '',
}) => {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId,
      performedBy: performedBy._id,
      performedByRole: performedBy.role,
      performedByName: performedBy.name || performedBy.username || 'Unknown',
      ipAddress,
      previousData,
      newData,
      description,
    });
  } catch (err) {
    // Audit log failure should not crash the main operation
    console.error('⚠️  Audit log failed:', err.message);
  }
};

/**
 * Helper to calculate attendance percentage based on business rules.
 */
const calculateAttendancePercentage = (morningPresent, afternoonPresent) => {
  if (morningPresent && afternoonPresent) return 100;
  if (morningPresent || afternoonPresent) return 50;
  return 0;
};

/**
 * Calculate marks totals.
 */
const calculateMarks = (mockTest, aptitude, technical) => {
  const total = (Number(mockTest) || 0) + (Number(aptitude) || 0) + (Number(technical) || 0);
  const average = parseFloat((total / 3).toFixed(2));
  return { total, average };
};

/**
 * Check if a date is today (same calendar day).
 */
const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Get start and end of a given date (midnight to 23:59:59).
 */
const getDayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Pagination helper for Mongoose queries.
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = {
  createAuditLog,
  calculateAttendancePercentage,
  calculateMarks,
  isToday,
  getDayRange,
  getPagination,
};
