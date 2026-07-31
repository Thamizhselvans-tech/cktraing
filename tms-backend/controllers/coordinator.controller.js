const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, STATUS, BCRYPT_ROUNDS } = require('../config/constants');
const bcrypt = require('bcryptjs');

// GET all coordinators
exports.getAllCoordinators = catchAsync(async (req, res) => {
  const { search, department, status: statusFilter } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let coordinators = await firebaseDb.getAll('coordinators');

  if (statusFilter && statusFilter !== 'all') {
    coordinators = coordinators.filter(c => (c.status || 'Active') === statusFilter);
  } else if (!statusFilter) {
    coordinators = coordinators.filter(c => (c.status || 'Active') === STATUS.ACTIVE);
  }

  if (department) {
    coordinators = coordinators.filter(c => c.departmentId === department);
  }

  if (search) {
    const q = search.toLowerCase();
    coordinators = coordinators.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }

  coordinators.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const populated = await firebaseDb.populateDepartmentMany(coordinators);
  const sanitized = populated.map(({ password, ...rest }) => rest);

  const total = sanitized.length;
  const paginated = sanitized.slice(skip, skip + l);

  return sendPaginated(res, 'Coordinators fetched', paginated, p, l, total);
});

// GET single coordinator
exports.getCoordinator = catchAsync(async (req, res) => {
  const raw = await firebaseDb.getById('coordinators', req.params.id);
  if (!raw) return sendError(res, 404, 'Coordinator not found.');
  const coordinator = await firebaseDb.populateDepartment(raw);
  delete coordinator.password;
  return sendSuccess(res, 200, 'Coordinator fetched', coordinator);
});

// POST create coordinator
exports.createCoordinator = catchAsync(async (req, res) => {
  const { username, name, email, department, phone } = req.body;

  if (!username || !name || !department) {
    return sendError(res, 400, 'Coordinator ID, name, and department are required.');
  }

  const dept = await firebaseDb.getById('departments', department);
  if (!dept || (dept.status || 'Active') === STATUS.INACTIVE) {
    return sendError(res, 404, 'Department not found or inactive.');
  }

  let deptCode = dept.code.toLowerCase();
  if (dept.name.toUpperCase().includes('CSE')) deptCode = 'cse';
  else if (dept.name.toUpperCase().includes('AIDS') || dept.name.toUpperCase().includes('ARTIFICIAL')) deptCode = 'aids';
  else if (dept.name.toUpperCase().includes('IT') || dept.name.toUpperCase().includes('INFORMATION')) deptCode = 'it';

  let coordId = username.trim().toLowerCase();
  coordId = coordId.replace(new RegExp(`${deptCode}$`, 'i'), '');
  
  const numCodeMatch = dept.code.match(/\d+/);
  if (numCodeMatch) {
    coordId = coordId.replace(new RegExp(`${numCodeMatch[0]}$`, 'i'), '');
  }

  if (!coordId) {
    coordId = numCodeMatch ? numCodeMatch[0] : deptCode;
  }

  const generatedUsername = `${coordId}${deptCode}`.toUpperCase();
  const generatedPassword = `${coordId}${deptCode}`;
  const hashedPassword = await bcrypt.hash(generatedPassword, BCRYPT_ROUNDS);

  const coordinator = await firebaseDb.create('coordinators', {
    username: generatedUsername,
    password: hashedPassword,
    name,
    email: email || '',
    departmentId: department,
    phone: phone || '',
    status: STATUS.ACTIVE,
    mustChangePassword: true,
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: 'Coordinator',
    entityId: coordinator._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created coordinator '${name}' (${username})`,
  });

  const result = await firebaseDb.populateDepartment(coordinator);
  delete result.password;
  return sendSuccess(res, 201, 'Coordinator created successfully', result);
});

// PUT update coordinator
exports.updateCoordinator = catchAsync(async (req, res) => {
  const { name, email, department, phone, status, password } = req.body;
  const coordinator = await firebaseDb.getById('coordinators', req.params.id);
  if (!coordinator) return sendError(res, 404, 'Coordinator not found.');

  const updates = {};
  if (name) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (department) updates.departmentId = department;
  if (phone !== undefined) updates.phone = phone;
  if (status) updates.status = status;
  if (password) {
    updates.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  const updated = await firebaseDb.update('coordinators', req.params.id, updates);

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'Coordinator',
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData: coordinator,
    description: `Updated coordinator '${updated.name}'`,
  });

  const result = await firebaseDb.populateDepartment(updated);
  delete result.password;
  return sendSuccess(res, 200, 'Coordinator updated successfully', result);
});

// DELETE (soft delete) coordinator
exports.deleteCoordinator = catchAsync(async (req, res) => {
  const coordinator = await firebaseDb.getById('coordinators', req.params.id);
  if (!coordinator) return sendError(res, 404, 'Coordinator not found.');

  await firebaseDb.update('coordinators', req.params.id, { status: STATUS.INACTIVE });

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: 'Coordinator',
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Soft-deleted coordinator '${coordinator.name}'`,
  });

  return sendSuccess(res, 200, 'Coordinator deactivated successfully.');
});
