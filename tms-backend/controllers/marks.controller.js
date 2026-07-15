const Marks = require('../models/Marks.model');
const Student = require('../models/Student.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, ROLES } = require('../config/constants');

// GET all marks
exports.getAllMarks = catchAsync(async (req, res) => {
  const { department, search } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (department) filter.department = department;

  let query = Marks.find(filter)
    .populate({ path: 'student', select: 'name registerNumber department', match: search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { registerNumber: { $regex: search, $options: 'i' } }] } : {} })
    .populate('department', 'name code')
    .populate('enteredBy', 'name username')
    .populate('verifiedBy', 'name username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(l);

  const [marks, total] = await Promise.all([query, Marks.countDocuments(filter)]);

  return sendPaginated(res, 'Marks fetched', marks, p, l, total);
});

// GET student marks
exports.getStudentMarks = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { role, id: userId } = req.user;

  if (role === ROLES.STUDENT && userId.toString() !== studentId.toString()) {
    return sendError(res, 403, 'You can only view your own marks.');
  }

  const marks = await Marks.findOne({ student: studentId })
    .populate('student', 'name registerNumber')
    .populate('department', 'name code')
    .populate('enteredBy', 'name username')
    .populate('verifiedBy', 'name username');

  if (!marks) return sendError(res, 404, 'No marks found for this student.');
  return sendSuccess(res, 200, 'Marks fetched', marks);
});

// GET department marks
exports.getDepartmentMarks = catchAsync(async (req, res) => {
  const { deptId } = req.params;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const [marks, total] = await Promise.all([
    Marks.find({ department: deptId })
      .populate('student', 'name registerNumber year batch')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l),
    Marks.countDocuments({ department: deptId }),
  ]);

  return sendPaginated(res, 'Department marks fetched', marks, p, l, total);
});

// POST create/update marks
exports.createOrUpdateMarks = catchAsync(async (req, res) => {
  const { student, department, mockTest, aptitude, technical } = req.body;

  if (!student || !department) {
    return sendError(res, 400, 'Student and department are required.');
  }

  const studentDoc = await Student.findById(student);
  if (!studentDoc) return sendError(res, 404, 'Student not found.');

  // Check if marks exist already
  let marks = await Marks.findOne({ student });

  if (marks) {
    if (marks.isVerified) {
      return sendError(res, 403, 'Marks are verified and locked. Admin must unlock before editing.');
    }
    const previousData = marks.toObject();

    if (mockTest !== undefined) marks.mockTest = mockTest;
    if (aptitude !== undefined) marks.aptitude = aptitude;
    if (technical !== undefined) marks.technical = technical;
    marks.enteredBy = req.user.id;
    await marks.save();

    await createAuditLog({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.MARKS,
      entityId: marks._id,
      performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
      ipAddress: req.ip,
      previousData,
      newData: { mockTest: marks.mockTest, aptitude: marks.aptitude, technical: marks.technical },
      description: `Updated marks for student ${studentDoc.registerNumber}`,
    });

    return sendSuccess(res, 200, 'Marks updated', marks);
  }

  marks = await Marks.create({
    student,
    department,
    mockTest: mockTest || 0,
    aptitude: aptitude || 0,
    technical: technical || 0,
    enteredBy: req.user.id,
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.MARKS,
    entityId: marks._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created marks for student ${studentDoc.registerNumber}`,
  });

  return sendSuccess(res, 201, 'Marks created', marks);
});

// POST verify/lock marks (Admin only)
exports.verifyMarks = catchAsync(async (req, res) => {
  const marks = await Marks.findById(req.params.id);
  if (!marks) return sendError(res, 404, 'Marks not found.');

  if (marks.isVerified) {
    return sendError(res, 400, 'Marks are already verified.');
  }

  marks.isVerified = true;
  marks.verifiedBy = req.user.id;
  marks.verifiedAt = new Date();
  await marks.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.VERIFY,
    entity: AUDIT_ENTITIES.MARKS,
    entityId: marks._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Admin verified marks ${marks._id}`,
  });

  return sendSuccess(res, 200, 'Marks verified and locked.', marks);
});

// POST unlock marks (Admin only)
exports.unlockMarks = catchAsync(async (req, res) => {
  const marks = await Marks.findById(req.params.id);
  if (!marks) return sendError(res, 404, 'Marks not found.');

  if (!marks.isVerified) {
    return sendError(res, 400, 'Marks are not locked.');
  }

  marks.isVerified = false;
  marks.unlockedBy = req.user.id;
  marks.unlockedAt = new Date();
  await marks.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UNLOCK,
    entity: AUDIT_ENTITIES.MARKS,
    entityId: marks._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Admin unlocked marks ${marks._id}`,
  });

  return sendSuccess(res, 200, 'Marks unlocked for editing.', marks);
});
