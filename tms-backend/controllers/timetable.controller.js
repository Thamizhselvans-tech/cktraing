const InternalTimetable = require('../models/InternalTimetable.model');
const ExternalTimetable = require('../models/ExternalTimetable.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../config/constants');

// ─── INTERNAL TIMETABLE ────────────────────────────────────────────────────────

exports.getInternalTimetable = catchAsync(async (req, res) => {
  const { department, month, year, status, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (department) {
    filter.$or = [
      { department: department },
      { department: { $exists: false } },
      { department: null }
    ];
  }
  if (status) filter.status = status;
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    filter.date = { $gte: start, $lte: end };
  }

  const [entries, total] = await Promise.all([
    InternalTimetable.find(filter)
      .populate('department', 'name code')
      .populate('createdBy', 'name username')
      .sort({ date: 1 })
      .skip(skip)
      .limit(l),
    InternalTimetable.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Internal timetable fetched', entries, p, l, total);
});

exports.createInternalTimetable = catchAsync(async (req, res) => {
  const entry = await InternalTimetable.create({ ...req.body, createdBy: req.user.id });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.INTERNAL_TIMETABLE,
    entityId: entry._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created internal timetable entry: '${entry.title}'`,
  });

  return sendSuccess(res, 201, 'Internal timetable entry created', entry);
});

exports.updateInternalTimetable = catchAsync(async (req, res) => {
  const entry = await InternalTimetable.findById(req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  const previousData = entry.toObject();
  Object.assign(entry, req.body);
  await entry.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.INTERNAL_TIMETABLE,
    entityId: entry._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData,
    description: `Updated internal timetable entry: '${entry.title}'`,
  });

  return sendSuccess(res, 200, 'Internal timetable entry updated', entry);
});

exports.deleteInternalTimetable = catchAsync(async (req, res) => {
  const entry = await InternalTimetable.findById(req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.INTERNAL_TIMETABLE,
    entityId: entry._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted internal timetable entry: '${entry.title}'`,
  });

  await entry.deleteOne();
  return sendSuccess(res, 200, 'Internal timetable entry deleted.');
});

// ─── EXTERNAL TIMETABLE ────────────────────────────────────────────────────────

exports.getExternalTimetable = catchAsync(async (req, res) => {
  const { department, company, status, startDate, endDate, month, year } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (department) {
    filter.$or = [
      { department: department },
      { department: { $exists: false } },
      { department: null }
    ];
  }
  if (company) filter.company = { $regex: company, $options: 'i' };
  if (status) filter.status = status;
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    filter.date = { $gte: start, $lte: end };
  }

  const [entries, total] = await Promise.all([
    ExternalTimetable.find(filter)
      .populate('department', 'name code')
      .populate('createdBy', 'name username')
      .sort({ date: 1 })
      .skip(skip)
      .limit(l),
    ExternalTimetable.countDocuments(filter),
  ]);

  return sendPaginated(res, 'External timetable fetched', entries, p, l, total);
});

exports.createExternalTimetable = catchAsync(async (req, res) => {
  if (!req.body.company) return sendError(res, 400, 'Company name is required.');
  const entry = await ExternalTimetable.create({ ...req.body, createdBy: req.user.id });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.EXTERNAL_TIMETABLE,
    entityId: entry._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created external timetable entry: '${entry.title}' by ${entry.company}`,
  });

  return sendSuccess(res, 201, 'External timetable entry created', entry);
});

exports.updateExternalTimetable = catchAsync(async (req, res) => {
  const entry = await ExternalTimetable.findById(req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  const previousData = entry.toObject();
  Object.assign(entry, req.body);
  await entry.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.EXTERNAL_TIMETABLE,
    entityId: entry._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData,
    description: `Updated external timetable entry: '${entry.title}'`,
  });

  return sendSuccess(res, 200, 'External timetable entry updated', entry);
});

exports.deleteExternalTimetable = catchAsync(async (req, res) => {
  const entry = await ExternalTimetable.findById(req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.EXTERNAL_TIMETABLE,
    entityId: entry._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted external timetable entry: '${entry.title}'`,
  });

  await entry.deleteOne();
  return sendSuccess(res, 200, 'External timetable entry deleted.');
});
