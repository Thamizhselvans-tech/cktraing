const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS } = require('../config/constants');

exports.getSchedules = catchAsync(async (req, res) => {
  const { type, status, month, year, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let schedules = await firebaseDb.getAll('admin_schedules');

  if (type) schedules = schedules.filter(s => s.type === type);
  if (status) schedules = schedules.filter(s => s.status === status);

  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    schedules = schedules.filter(item => {
      const d = new Date(item.date);
      return d >= s && d <= e;
    });
  } else if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    schedules = schedules.filter(item => {
      const d = new Date(item.date);
      return d >= start && d <= end;
    });
  }

  schedules.sort((a, b) => new Date(a.date) - new Date(b.date));

  const total = schedules.length;
  const paginated = schedules.slice(skip, skip + l);

  return sendPaginated(res, 'Schedules fetched', paginated, p, l, total);
});

exports.createSchedule = catchAsync(async (req, res) => {
  const schedule = await firebaseDb.create('admin_schedules', { ...req.body, createdBy: req.user.id });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: 'AdminSchedule',
    entityId: schedule._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created admin schedule: '${schedule.title}'`,
  });

  return sendSuccess(res, 201, 'Schedule created', schedule);
});

exports.updateSchedule = catchAsync(async (req, res) => {
  const schedule = await firebaseDb.getById('admin_schedules', req.params.id);
  if (!schedule) return sendError(res, 404, 'Schedule not found.');

  const updated = await firebaseDb.update('admin_schedules', req.params.id, req.body);

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'AdminSchedule',
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData: schedule,
    description: `Updated admin schedule: '${updated.title}'`,
  });

  return sendSuccess(res, 200, 'Schedule updated', updated);
});

exports.deleteSchedule = catchAsync(async (req, res) => {
  const schedule = await firebaseDb.getById('admin_schedules', req.params.id);
  if (!schedule) return sendError(res, 404, 'Schedule not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: 'AdminSchedule',
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted admin schedule: '${schedule.title}'`,
  });

  await firebaseDb.remove('admin_schedules', req.params.id);
  return sendSuccess(res, 200, 'Schedule deleted.');
});
