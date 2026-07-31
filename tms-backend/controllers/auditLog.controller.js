const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendPaginated } = require('../utils/apiResponse');
const { getPagination } = require('../utils/helpers');

exports.getAuditLogs = catchAsync(async (req, res) => {
  const { action, entity, performedBy, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let logs = await firebaseDb.getAll('audit_logs');

  if (action) logs = logs.filter(log => log.action === action);
  if (entity) logs = logs.filter(log => log.entity === entity);
  if (performedBy) logs = logs.filter(log => log.performedBy === performedBy);
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    logs = logs.filter(log => {
      const d = new Date(log.createdAt);
      return d >= s && d <= e;
    });
  }

  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = logs.length;
  const paginated = logs.slice(skip, skip + l);

  return sendPaginated(res, 'Audit logs fetched', paginated, p, l, total);
});
