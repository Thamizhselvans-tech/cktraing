const AuditLog = require('../models/AuditLog.model');
const catchAsync = require('../utils/catchAsync');
const { sendPaginated } = require('../utils/apiResponse');
const { getPagination } = require('../utils/helpers');

exports.getAuditLogs = catchAsync(async (req, res) => {
  const { action, entity, performedBy, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (performedBy) filter.performedBy = performedBy;
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
    AuditLog.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Audit logs fetched', logs, p, l, total);
});
