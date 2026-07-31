const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, STATUS } = require('../config/constants');

// GET all departments
exports.getAllDepartments = catchAsync(async (req, res) => {
  const { search, status } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let departments = await firebaseDb.getAll('departments');

  if (status) {
    departments = departments.filter(d => (d.status || 'Active') === status);
  }
  if (search) {
    const q = search.toLowerCase();
    departments = departments.filter(d => 
      (d.name && d.name.toLowerCase().includes(q)) || 
      (d.code && d.code.toLowerCase().includes(q))
    );
  }

  departments.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const total = departments.length;
  const paginated = departments.slice(skip, skip + l);

  return sendPaginated(res, 'Departments fetched', paginated, p, l, total);
});

// GET single department
exports.getDepartment = catchAsync(async (req, res) => {
  const department = await firebaseDb.getById('departments', req.params.id);
  if (!department) return sendError(res, 404, 'Department not found.');
  return sendSuccess(res, 200, 'Department fetched', department);
});

// POST create department
exports.createDepartment = catchAsync(async (req, res) => {
  const { name, code, description } = req.body;

  if (!name || !code) return sendError(res, 400, 'Name and code are required.');

  const upperCode = code.trim().toUpperCase();
  const cleanName = name.trim();

  const existingDepts = await firebaseDb.getAll('departments');
  const existing = existingDepts.find(d => 
    (d.name && d.name.toLowerCase() === cleanName.toLowerCase()) || 
    (d.code && d.code.toUpperCase() === upperCode)
  );

  if (existing) {
    return sendError(res, 409, `Department code '${upperCode}' or name '${cleanName}' already exists.`);
  }

  const department = await firebaseDb.create('departments', {
    name: cleanName,
    code: upperCode,
    description: description ? description.trim() : '',
    status: STATUS.ACTIVE
  });

  const performedBy = req.user ? { _id: req.user.id || '', name: req.user.name || req.user.username || 'Admin', role: req.user.role || 'admin' } : {};

  createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.DEPARTMENT,
    entityId: department._id,
    performedBy,
    ipAddress: req.ip,
    newData: department,
    description: `Created department '${cleanName}'`,
  });

  return sendSuccess(res, 201, 'Department created successfully', department);
});

// PUT update department
exports.updateDepartment = catchAsync(async (req, res) => {
  const { name, code, description, status } = req.body;
  const department = await firebaseDb.getById('departments', req.params.id);
  if (!department) return sendError(res, 404, 'Department not found.');

  const updates = {};
  if (name) updates.name = name.trim();
  if (code) updates.code = code.trim().toUpperCase();
  if (description !== undefined) updates.description = description ? description.trim() : '';
  if (status) updates.status = status;

  const updatedDept = await firebaseDb.update('departments', req.params.id, updates);

  const performedBy = req.user ? { _id: req.user.id || '', name: req.user.name || req.user.username || 'Admin', role: req.user.role || 'admin' } : {};

  createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.DEPARTMENT,
    entityId: req.params.id,
    performedBy,
    ipAddress: req.ip,
    previousData: department,
    newData: updatedDept,
    description: `Updated department '${updatedDept.name}'`,
  });

  return sendSuccess(res, 200, 'Department updated successfully', updatedDept);
});

// DELETE department
exports.deleteDepartment = catchAsync(async (req, res) => {
  const department = await firebaseDb.getById('departments', req.params.id);
  if (!department) return sendError(res, 404, 'Department not found.');

  const isForce = req.query.force === 'true';
  const students = await firebaseDb.find('students', s => s.departmentId === req.params.id && (s.status || 'Active') === STATUS.ACTIVE);
  
  if (students.length > 0 && !isForce) {
    return sendError(
      res,
      409,
      `Cannot delete department. ${students.length} active student(s) still assigned.`
    );
  }

  if (isForce || students.length === 0) {
    await firebaseDb.remove('departments', req.params.id);
  } else {
    await firebaseDb.update('departments', req.params.id, { status: STATUS.INACTIVE });
  }

  const performedBy = req.user ? { _id: req.user.id || '', name: req.user.name || req.user.username || 'Admin', role: req.user.role || 'admin' } : {};

  createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.DEPARTMENT,
    entityId: req.params.id,
    performedBy,
    ipAddress: req.ip,
    description: `Deleted department '${department.name}'`,
  });

  return sendSuccess(res, 200, 'Department deleted successfully.');
});
