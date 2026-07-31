const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../config/constants');

// ─── INTERNAL TIMETABLE ────────────────────────────────────────────────────────

exports.getInternalTimetable = catchAsync(async (req, res) => {
  const { department, month, year, status, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let entries = await firebaseDb.getAll('internal_timetables');

  if (department) {
    entries = entries.filter(e => !e.departmentId || e.departmentId === department);
  }
  if (status) entries = entries.filter(e => e.status === status);
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    entries = entries.filter(item => {
      const d = new Date(item.date);
      return d >= s && d <= e;
    });
  } else if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    entries = entries.filter(item => {
      const d = new Date(item.date);
      return d >= start && d <= end;
    });
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  const total = entries.length;
  const paginated = entries.slice(skip, skip + l);

  return sendPaginated(res, 'Internal timetable fetched', paginated, p, l, total);
});

exports.createInternalTimetable = catchAsync(async (req, res) => {
  const entry = await firebaseDb.create('internal_timetables', { ...req.body, createdBy: req.user.id });

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
  const entry = await firebaseDb.getById('internal_timetables', req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  const updated = await firebaseDb.update('internal_timetables', req.params.id, req.body);

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.INTERNAL_TIMETABLE,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData: entry,
    description: `Updated internal timetable entry: '${updated.title}'`,
  });

  return sendSuccess(res, 200, 'Internal timetable entry updated', updated);
});

exports.deleteInternalTimetable = catchAsync(async (req, res) => {
  const entry = await firebaseDb.getById('internal_timetables', req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.INTERNAL_TIMETABLE,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted internal timetable entry: '${entry.title}'`,
  });

  await firebaseDb.remove('internal_timetables', req.params.id);
  return sendSuccess(res, 200, 'Internal timetable entry deleted.');
});

// ─── EXTERNAL TIMETABLE ────────────────────────────────────────────────────────

exports.getExternalTimetable = catchAsync(async (req, res) => {
  const { department, company, status, startDate, endDate, month, year } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let entries = await firebaseDb.getAll('external_timetables');

  if (department) {
    entries = entries.filter(e => !e.departmentId || e.departmentId === department);
  }
  if (company) {
    const q = company.toLowerCase();
    entries = entries.filter(e => e.company && e.company.toLowerCase().includes(q));
  }
  if (status) entries = entries.filter(e => e.status === status);
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    entries = entries.filter(item => {
      const d = new Date(item.date);
      return d >= s && d <= e;
    });
  } else if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    entries = entries.filter(item => {
      const d = new Date(item.date);
      return d >= start && d <= end;
    });
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  const total = entries.length;
  const paginated = entries.slice(skip, skip + l);

  return sendPaginated(res, 'External timetable fetched', paginated, p, l, total);
});

exports.createExternalTimetable = catchAsync(async (req, res) => {
  if (!req.body.company) return sendError(res, 400, 'Company name is required.');
  const entry = await firebaseDb.create('external_timetables', { ...req.body, createdBy: req.user.id });

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
  const entry = await firebaseDb.getById('external_timetables', req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  const updated = await firebaseDb.update('external_timetables', req.params.id, req.body);

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.EXTERNAL_TIMETABLE,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData: entry,
    description: `Updated external timetable entry: '${updated.title}'`,
  });

  return sendSuccess(res, 200, 'External timetable entry updated', updated);
});

exports.deleteExternalTimetable = catchAsync(async (req, res) => {
  const entry = await firebaseDb.getById('external_timetables', req.params.id);
  if (!entry) return sendError(res, 404, 'Entry not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.EXTERNAL_TIMETABLE,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Deleted external timetable entry: '${entry.title}'`,
  });

  await firebaseDb.remove('external_timetables', req.params.id);
  return sendSuccess(res, 200, 'External timetable entry deleted.');
});
