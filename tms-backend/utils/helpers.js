const firebaseDb = require('../services/firebaseDb.service');

/**
 * Parses any date format safely (YYYY-MM-DD, DD-MM-YYYY, ISO, Date instance).
 */
const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? new Date() : dateVal;

  if (typeof dateVal === 'string') {
    const clean = dateVal.trim();
    if (clean.includes('-')) {
      const parts = clean.split('T')[0].split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
    }
  }

  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Creates an audit log entry.
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
    await firebaseDb.create('audit_logs', {
      action,
      entity,
      entityId: entityId ? entityId.toString() : null,
      performedBy: performedBy._id ? performedBy._id.toString() : null,
      performedByRole: performedBy.role,
      performedByName: performedBy.name || performedBy.username || 'Unknown',
      ipAddress: ipAddress || '',
      previousData,
      newData,
      description,
    });
  } catch (err) {
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
const isToday = (dateVal) => {
  const today = new Date();
  const d = parseSafeDate(dateVal);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Get start and end of a given date (midnight to 23:59:59).
 */
const getDayRange = (dateVal) => {
  const start = parseSafeDate(dateVal);
  start.setHours(0, 0, 0, 0);
  const end = parseSafeDate(dateVal);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Pagination helper.
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = {
  parseSafeDate,
  createAuditLog,
  calculateAttendancePercentage,
  calculateMarks,
  isToday,
  getDayRange,
  getPagination,
};
