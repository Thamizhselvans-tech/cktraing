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
 * Creates an audit log entry (Non-blocking background execution for maximum API speed).
 */
const createAuditLog = async ({
  action,
  entity,
  entityId,
  performedBy = {},
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
    console.error('⚠️  Audit log background write failed:', err.message);
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
  formatDateYYYYMMDD: (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      return dateVal.trim();
    }
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },
  isSameDay: (date1, date2) => {
    if (!date1 || !date2) return false;

    const d1Str = typeof date1 === 'string' ? date1.split('T')[0].trim() : '';
    const d2Str = typeof date2 === 'string' ? date2.split('T')[0].trim() : '';

    if (d1Str && d2Str && d1Str === d2Str) return true;

    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;

    // Check local YYYY-MM-DD
    const y1 = d1.getFullYear(), m1 = String(d1.getMonth() + 1).padStart(2, '0'), day1 = String(d1.getDate()).padStart(2, '0');
    const fmt1 = `${y1}-${m1}-${day1}`;

    const y2 = d2.getFullYear(), m2 = String(d2.getMonth() + 1).padStart(2, '0'), day2 = String(d2.getDate()).padStart(2, '0');
    const fmt2 = `${y2}-${m2}-${day2}`;

    if (fmt1 === fmt2) return true;

    // Check UTC YYYY-MM-DD
    const u1 = d1.toISOString().split('T')[0];
    const u2 = d2.toISOString().split('T')[0];
    return u1 === u2 || fmt1 === u2 || u1 === fmt2;
  }
};
