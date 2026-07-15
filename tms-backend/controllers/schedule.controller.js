const AdminSchedule = require('../models/AdminSchedule.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS } = require('../config/constants');

exports.getSchedules = catchAsync(async (req, res) => {
  const { type, status, month, year, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    filter.date = { $gte: start, $lte: end };
  }

  const [schedules, total] = await Promise.all([
    AdminSchedule.find(filter)
      .populate('createdBy', 'name username')
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(l),
    AdminSchedule.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Schedules fetched', schedules, p, l, total);
});

exports.createSchedule = catchAsync(async (req, res) => {
  const schedule = await AdminSchedule.create({ ...req.body, createdBy: req.user.id });

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
  const schedule = await AdminSchedule.findById(req.params.id);
  if (!schedule) return sendError(res, 404, 'Schedule not found.');

  const previousData = schedule.toObject();
  Object.assign(schedule, req.body);
  await schedule.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'AdminSchedule',
    entityId: schedule._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData,
    description: `Updated admin schedule: '${schedule.title}'`,
  });

  return sendSuccess(res, 200, 'Schedule updated', schedule);
});

exports.deleteSchedule = catchAsync(async (req, res) => {
  const schedule = await AdminSchedule.findById(req.params.id);
  if (!schedule) return sendError(res, 404, 'Schedule not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: 'AdminSchedule',
    entityId: schedule._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted admin schedule: '${schedule.title}'`,
  });

  await schedule.deleteOne();
  return sendSuccess(res, 200, 'Schedule deleted.');
});
