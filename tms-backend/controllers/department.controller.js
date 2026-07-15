const Department = require('../models/Department.model');
const Student = require('../models/Student.model');
const DepartmentCoordinator = require('../models/DepartmentCoordinator.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, STATUS } = require('../config/constants');

// GET all departments
exports.getAllDepartments = catchAsync(async (req, res) => {
  const { search, status, page, limit } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const [departments, total] = await Promise.all([
    Department.find(filter).sort({ name: 1 }).skip(skip).limit(l),
    Department.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Departments fetched', departments, p, l, total);
});

// GET single department
exports.getDepartment = catchAsync(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) return sendError(res, 404, 'Department not found.');
  return sendSuccess(res, 200, 'Department fetched', department);
});

// POST create department
exports.createDepartment = catchAsync(async (req, res) => {
  const { name, code, description } = req.body;

  if (!name || !code) return sendError(res, 400, 'Name and code are required.');

  const existing = await Department.findOne({
    $or: [
      { name: { $regex: `^${name}$`, $options: 'i' } },
      { code: code.toUpperCase() },
    ],
  });
  if (existing) return sendError(res, 409, 'Department name or code already exists.');

  const department = await Department.create({ name, code: code.toUpperCase(), description });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.DEPARTMENT,
    entityId: department._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    newData: department.toObject(),
    description: `Created department '${name}'`,
  });

  return sendSuccess(res, 201, 'Department created successfully', department);
});

// PUT update department
exports.updateDepartment = catchAsync(async (req, res) => {
  const { name, code, description, status } = req.body;
  const department = await Department.findById(req.params.id);
  if (!department) return sendError(res, 404, 'Department not found.');

  const previousData = department.toObject();

  if (name) department.name = name;
  if (code) department.code = code.toUpperCase();
  if (description !== undefined) department.description = description;
  if (status) department.status = status;

  await department.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.DEPARTMENT,
    entityId: department._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData,
    newData: department.toObject(),
    description: `Updated department '${department.name}'`,
  });

  return sendSuccess(res, 200, 'Department updated successfully', department);
});

// DELETE (soft delete) department
exports.deleteDepartment = catchAsync(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) return sendError(res, 404, 'Department not found.');

  // Check for active students or coordinators
  const activeStudents = await Student.countDocuments({
    department: department._id,
    status: STATUS.ACTIVE,
  });
  if (activeStudents > 0) {
    return sendError(
      res,
      409,
      `Cannot deactivate department. ${activeStudents} active student(s) still assigned.`
    );
  }

  department.status = STATUS.INACTIVE;
  await department.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.DEPARTMENT,
    entityId: department._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Soft-deleted department '${department.name}'`,
  });

  return sendSuccess(res, 200, 'Department deactivated successfully.');
});
