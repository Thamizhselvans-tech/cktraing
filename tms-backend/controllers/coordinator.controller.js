const DepartmentCoordinator = require('../models/DepartmentCoordinator.model');
const Department = require('../models/Department.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, STATUS } = require('../config/constants');

// GET all coordinators
exports.getAllCoordinators = catchAsync(async (req, res) => {
  const { search, department, status: statusFilter } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (statusFilter && statusFilter !== 'all') {
    filter.status = statusFilter;
  } else if (!statusFilter) {
    filter.status = STATUS.ACTIVE;
  }
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [coordinators, total] = await Promise.all([
    DepartmentCoordinator.find(filter)
      .populate('department', 'name code')
      .sort({ name: 1 })
      .skip(skip)
      .limit(l)
      .select('-password'),
    DepartmentCoordinator.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Coordinators fetched', coordinators, p, l, total);
});

// GET single coordinator
exports.getCoordinator = catchAsync(async (req, res) => {
  const coordinator = await DepartmentCoordinator.findById(req.params.id)
    .populate('department', 'name code')
    .select('-password');
  if (!coordinator) return sendError(res, 404, 'Coordinator not found.');
  return sendSuccess(res, 200, 'Coordinator fetched', coordinator);
});

// POST create coordinator
exports.createCoordinator = catchAsync(async (req, res) => {
  const { username, password, name, email, department, phone } = req.body;

  if (!username || !password || !name || !department) {
    return sendError(res, 400, 'Username, password, name, and department are required.');
  }

  const dept = await Department.findById(department);
  if (!dept || dept.status === STATUS.INACTIVE) {
    return sendError(res, 404, 'Department not found or inactive.');
  }

  const coordinator = await DepartmentCoordinator.create({
    username, password, name, email, department, phone,
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: 'Coordinator',
    entityId: coordinator._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created coordinator '${name}' (${username})`,
  });

  const result = await DepartmentCoordinator.findById(coordinator._id)
    .populate('department', 'name code')
    .select('-password');
  return sendSuccess(res, 201, 'Coordinator created successfully', result);
});

// PUT update coordinator
exports.updateCoordinator = catchAsync(async (req, res) => {
  const { name, email, department, phone, status, password } = req.body;
  const coordinator = await DepartmentCoordinator.findById(req.params.id);
  if (!coordinator) return sendError(res, 404, 'Coordinator not found.');

  const previousData = coordinator.toObject();

  if (name) coordinator.name = name;
  if (email !== undefined) coordinator.email = email;
  if (department) coordinator.department = department;
  if (phone !== undefined) coordinator.phone = phone;
  if (status) coordinator.status = status;
  if (password) coordinator.password = password; // Will be hashed by pre-save hook

  await coordinator.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'Coordinator',
    entityId: coordinator._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData,
    description: `Updated coordinator '${coordinator.name}'`,
  });

  const result = await DepartmentCoordinator.findById(coordinator._id)
    .populate('department', 'name code')
    .select('-password');
  return sendSuccess(res, 200, 'Coordinator updated successfully', result);
});

// DELETE (soft delete) coordinator
exports.deleteCoordinator = catchAsync(async (req, res) => {
  const coordinator = await DepartmentCoordinator.findById(req.params.id);
  if (!coordinator) return sendError(res, 404, 'Coordinator not found.');

  coordinator.status = STATUS.INACTIVE;
  await coordinator.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: 'Coordinator',
    entityId: coordinator._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Soft-deleted coordinator '${coordinator.name}'`,
  });

  return sendSuccess(res, 200, 'Coordinator deactivated successfully.');
});
