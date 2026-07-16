const Admin = require('../models/Admin.model');
const Student = require('../models/Student.model');
const DepartmentCoordinator = require('../models/DepartmentCoordinator.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { generateTokenAndSetCookie, clearTokenCookie } = require('../middlewares/auth.middleware');
const { createAuditLog } = require('../utils/helpers');
const { ROLES, AUDIT_ACTIONS, AUDIT_ENTITIES, STATUS } = require('../config/constants');
const bcrypt = require('bcryptjs');

// ─── Admin Login ───────────────────────────────────────────────────────────────
exports.adminLogin = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return sendError(res, 400, 'Username and password are required.');
  }

  const admin = await Admin.findOne({ username, isActive: true }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    return sendError(res, 401, 'Invalid username or password.');
  }

  const payload = { id: admin._id, role: ROLES.ADMIN, name: admin.name, username: admin.username };
  generateTokenAndSetCookie(res, payload);

  await createAuditLog({
    action: AUDIT_ACTIONS.LOGIN,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: admin._id,
    performedBy: { _id: admin._id, name: admin.name, role: ROLES.ADMIN },
    ipAddress: req.ip,
    description: `Admin '${admin.username}' logged in`,
  });

  return sendSuccess(res, 200, 'Login successful', {
    id: admin._id,
    name: admin.name,
    username: admin.username,
    email: admin.email,
    role: ROLES.ADMIN,
  });
});

// ─── Coordinator Login ─────────────────────────────────────────────────────────
exports.coordinatorLogin = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return sendError(res, 400, 'Username and password are required.');
  }

  const coordinator = await DepartmentCoordinator.findOne({
    username: username.trim().toUpperCase(),
    status: STATUS.ACTIVE,
  })
    .select('+password')
    .populate('department', 'name code');

  if (!coordinator || !(await coordinator.comparePassword(password))) {
    return sendError(res, 401, 'Invalid username or password.');
  }

  const payload = {
    id: coordinator._id,
    role: ROLES.COORDINATOR,
    name: coordinator.name,
    username: coordinator.username,
    department: coordinator.department?._id,
  };
  generateTokenAndSetCookie(res, payload);

  await createAuditLog({
    action: AUDIT_ACTIONS.LOGIN,
    entity: 'Coordinator',
    entityId: coordinator._id,
    performedBy: { _id: coordinator._id, name: coordinator.name, role: ROLES.COORDINATOR },
    ipAddress: req.ip,
    description: `Coordinator '${coordinator.username}' logged in`,
  });

  return sendSuccess(res, 200, 'Login successful', {
    id: coordinator._id,
    name: coordinator.name,
    username: coordinator.username,
    email: coordinator.email,
    role: ROLES.COORDINATOR,
    department: coordinator.department,
  });
});

// ─── Student Login ─────────────────────────────────────────────────────────────
exports.studentLogin = catchAsync(async (req, res) => {
  const { registerNumber, password } = req.body;

  if (!registerNumber || !password) {
    return sendError(res, 400, 'Register number and password are required.');
  }

  const student = await Student.findOne({
    registerNumber: registerNumber.trim().toUpperCase(),
    status: STATUS.ACTIVE,
  })
    .select('+password')
    .populate('department', 'name code');

  if (!student || !(await student.comparePassword(password))) {
    return sendError(res, 401, 'Invalid register number or password.');
  }

  const payload = {
    id: student._id,
    role: ROLES.STUDENT,
    name: student.name,
    registerNumber: student.registerNumber,
    department: student.department?._id,
    mustChangePassword: student.mustChangePassword,
  };
  generateTokenAndSetCookie(res, payload);

  await createAuditLog({
    action: AUDIT_ACTIONS.LOGIN,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: student._id,
    performedBy: { _id: student._id, name: student.name, role: ROLES.STUDENT },
    ipAddress: req.ip,
    description: `Student '${student.registerNumber}' logged in`,
  });

  return sendSuccess(res, 200, 'Login successful', {
    id: student._id,
    name: student.name,
    registerNumber: student.registerNumber,
    email: student.email,
    role: ROLES.STUDENT,
    department: student.department,
    year: student.year,
    batch: student.batch,
    mustChangePassword: student.mustChangePassword,
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = catchAsync(async (req, res) => {
  if (req.user) {
    await createAuditLog({
      action: AUDIT_ACTIONS.LOGOUT,
      entity: 'User',
      entityId: req.user.id,
      performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
      ipAddress: req.ip,
      description: `${req.user.role} '${req.user.name}' logged out`,
    });
  }
  clearTokenCookie(res);
  return sendSuccess(res, 200, 'Logged out successfully');
});

// ─── Get Current User ─────────────────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res) => {
  const { id, role } = req.user;
  let user;

  if (role === ROLES.ADMIN) {
    user = await Admin.findById(id);
  } else if (role === ROLES.COORDINATOR) {
    user = await DepartmentCoordinator.findById(id).populate('department', 'name code');
  } else {
    user = await Student.findById(id).populate('department', 'name code');
  }

  if (!user) return sendError(res, 404, 'User not found.');

  return sendSuccess(res, 200, 'User profile fetched', { ...user.toObject(), role });
});

// ─── Change Password (Student first login or general) ─────────────────────────
exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id, role } = req.user;

  if (!currentPassword || !newPassword) {
    return sendError(res, 400, 'Current password and new password are required.');
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, 'New password must be at least 6 characters.');
  }

  let user;
  if (role === ROLES.STUDENT) {
    user = await Student.findById(id).select('+password');
  } else if (role === ROLES.COORDINATOR) {
    user = await DepartmentCoordinator.findById(id).select('+password');
  } else {
    user = await Admin.findById(id).select('+password');
  }

  if (!user || !(await user.comparePassword(currentPassword))) {
    return sendError(res, 400, 'Current password is incorrect.');
  }

  if (currentPassword === newPassword) {
    return sendError(res, 400, 'New password cannot be the same as the current password.');
  }

  user.password = newPassword;
  if (role === ROLES.STUDENT) {
    user.mustChangePassword = false;
  }
  await user.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'User',
    entityId: user._id,
    performedBy: { _id: user._id, name: user.name, role },
    ipAddress: req.ip,
    description: `Password changed for ${role} '${user.name}'`,
  });

  return sendSuccess(res, 200, 'Password changed successfully.');
});

// ─── Admin Reset Student Password ─────────────────────────────────────────────
exports.resetStudentPassword = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const admin = req.user;

  const student = await Student.findById(studentId).populate('department');
  if (!student) return sendError(res, 404, 'Student not found.');

  // Reset password to Department Code + Register Number
  const deptCode = student.department?.code?.toUpperCase() || 'CSE';
  const regNo = student.registerNumber.toUpperCase();
  const defaultPassword = deptCode + regNo;
  student.password = defaultPassword;
  student.mustChangePassword = true;
  await student.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.RESET_PASSWORD,
    entity: AUDIT_ENTITIES.STUDENT,
    entityId: student._id,
    performedBy: { _id: admin.id, name: admin.name, role: ROLES.ADMIN },
    ipAddress: req.ip,
    description: `Admin reset password for student '${student.registerNumber}'. Temporary password set to: ${defaultPassword}.`,
  });

  return sendSuccess(res, 200, `Password for ${student.name} has been reset to: ${defaultPassword}. They will be prompted to change it on next login.`);
});

// GET debug students status
exports.debugStudents = catchAsync(async (req, res) => {
  const Student = require('../models/Student.model');
  const bcrypt = require('bcryptjs');

  const students = await Student.find().select('+password').populate('department');
  
  const debugData = [];
  for (const student of students) {
    const deptCode = student.department?.code?.toUpperCase() || 'UNKNOWN';
    const matchesCSE = await bcrypt.compare('CSE', student.password);
    const matchesRegNo = await bcrypt.compare(student.registerNumber, student.password);
    
    debugData.push({
      registerNumber: student.registerNumber,
      name: student.name,
      status: student.status,
      mustChangePassword: student.mustChangePassword,
      departmentCode: deptCode,
      hasDepartmentObject: !!student.department,
      passwordMatchesCSE: matchesCSE,
      passwordMatchesRegNo: matchesRegNo,
    });
  }

  return res.json({
    success: true,
    total: students.length,
    students: debugData,
  });
});
