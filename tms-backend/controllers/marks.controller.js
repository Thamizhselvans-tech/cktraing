const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, ROLES } = require('../config/constants');

// GET all marks
exports.getAllMarks = catchAsync(async (req, res) => {
  const { department, search } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let marks = await firebaseDb.getAll('marks');

  if (department) {
    marks = marks.filter(m => m.departmentId === department);
  }

  const students = await firebaseDb.getAll('students');
  const depts = await firebaseDb.getAll('departments');
  const coords = await firebaseDb.getAll('coordinators');
  const admins = await firebaseDb.getAll('admins');

  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });
  const deptMap = {};
  depts.forEach(d => { deptMap[d._id] = d; });
  const userMap = {};
  coords.forEach(c => { userMap[c._id] = c; });
  admins.forEach(a => { userMap[a._id] = a; });

  let populated = marks.map(m => ({
    ...m,
    student: m.studentId ? (studentMap[m.studentId] ? { _id: m.studentId, name: studentMap[m.studentId].name, registerNumber: studentMap[m.studentId].registerNumber, department: studentMap[m.studentId].departmentId } : null) : null,
    department: m.departmentId ? (deptMap[m.departmentId] || null) : null,
    enteredBy: m.enteredBy ? (userMap[m.enteredBy] || null) : null,
    verifiedBy: m.verifiedBy ? (userMap[m.verifiedBy] || null) : null,
  }));

  if (search) {
    const q = search.toLowerCase();
    populated = populated.filter(m => 
      m.student && ((m.student.name && m.student.name.toLowerCase().includes(q)) || (m.student.registerNumber && m.student.registerNumber.toLowerCase().includes(q)))
    );
  }

  populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = populated.length;
  const paginated = populated.slice(skip, skip + l);

  return sendPaginated(res, 'Marks fetched', paginated, p, l, total);
});

// GET student marks
exports.getStudentMarks = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { role, id: userId } = req.user;

  if (role === ROLES.STUDENT && userId.toString() !== studentId.toString()) {
    return sendError(res, 403, 'You can only view your own marks.');
  }

  const m = await firebaseDb.findOne('marks', r => r.studentId === studentId);
  if (!m) return sendError(res, 404, 'No marks found for this student.');

  const student = await firebaseDb.getById('students', studentId);
  const dept = m.departmentId ? await firebaseDb.getById('departments', m.departmentId) : null;

  const result = {
    ...m,
    student: student ? { _id: student._id, name: student.name, registerNumber: student.registerNumber } : null,
    department: dept
  };

  return sendSuccess(res, 200, 'Marks fetched', result);
});

// GET department marks
exports.getDepartmentMarks = catchAsync(async (req, res) => {
  const { deptId } = req.params;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let marks = await firebaseDb.find('marks', m => m.departmentId === deptId);
  const students = await firebaseDb.getAll('students');
  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });

  const populated = marks.map(m => ({
    ...m,
    student: m.studentId ? (studentMap[m.studentId] ? { _id: m.studentId, name: studentMap[m.studentId].name, registerNumber: studentMap[m.studentId].registerNumber, year: studentMap[m.studentId].year, batch: studentMap[m.studentId].batch } : null) : null
  }));

  populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = populated.length;
  const paginated = populated.slice(skip, skip + l);

  return sendPaginated(res, 'Department marks fetched', paginated, p, l, total);
});

// POST create/update marks
exports.createOrUpdateMarks = catchAsync(async (req, res) => {
  const { student, department, mockTest, aptitude, technical } = req.body;

  if (!student || !department) {
    return sendError(res, 400, 'Student and department are required.');
  }

  const studentDoc = await firebaseDb.getById('students', student);
  if (!studentDoc) return sendError(res, 404, 'Student not found.');

  const mTest = Number(mockTest) || 0;
  const apt = Number(aptitude) || 0;
  const tech = Number(technical) || 0;
  const totalMarks = mTest + apt + tech;
  const avgMarks = parseFloat((totalMarks / 3).toFixed(2));

  let existing = await firebaseDb.findOne('marks', m => m.studentId === student);

  if (existing) {
    if (existing.isVerified) {
      return sendError(res, 403, 'Marks are verified and locked. Admin must unlock before editing.');
    }

    const previousData = { ...existing };

    const updated = await firebaseDb.update('marks', existing._id, {
      mockTest: mTest,
      aptitude: apt,
      technical: tech,
      total: totalMarks,
      average: avgMarks,
      enteredBy: req.user.id,
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.MARKS,
      entityId: existing._id,
      performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
      ipAddress: req.ip,
      previousData,
      newData: { mockTest: mTest, aptitude: apt, technical: tech, total: totalMarks, average: avgMarks },
      description: `Updated marks for student ${studentDoc.registerNumber}`,
    });

    return sendSuccess(res, 200, 'Marks updated', updated);
  }

  const created = await firebaseDb.create('marks', {
    studentId: student,
    departmentId: department,
    mockTest: mTest,
    aptitude: apt,
    technical: tech,
    total: totalMarks,
    average: avgMarks,
    enteredBy: req.user.id,
    isVerified: false
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.MARKS,
    entityId: created._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Created marks for student ${studentDoc.registerNumber}`,
  });

  return sendSuccess(res, 201, 'Marks created', created);
});

// POST verify/lock marks (Admin only)
exports.verifyMarks = catchAsync(async (req, res) => {
  const marks = await firebaseDb.getById('marks', req.params.id);
  if (!marks) return sendError(res, 404, 'Marks not found.');

  if (marks.isVerified) {
    return sendError(res, 400, 'Marks are already verified.');
  }

  const updated = await firebaseDb.update('marks', req.params.id, {
    isVerified: true,
    verifiedBy: req.user.id,
    verifiedAt: new Date().toISOString()
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.VERIFY,
    entity: AUDIT_ENTITIES.MARKS,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Admin verified marks ${req.params.id}`,
  });

  return sendSuccess(res, 200, 'Marks verified and locked.', updated);
});

// POST unlock marks (Admin only)
exports.unlockMarks = catchAsync(async (req, res) => {
  const marks = await firebaseDb.getById('marks', req.params.id);
  if (!marks) return sendError(res, 404, 'Marks not found.');

  if (!marks.isVerified) {
    return sendError(res, 400, 'Marks are not locked.');
  }

  const updated = await firebaseDb.update('marks', req.params.id, {
    isVerified: false,
    unlockedBy: req.user.id,
    unlockedAt: new Date().toISOString()
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.UNLOCK,
    entity: AUDIT_ENTITIES.MARKS,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Admin unlocked marks ${req.params.id}`,
  });

  return sendSuccess(res, 200, 'Marks unlocked for editing.', updated);
});
