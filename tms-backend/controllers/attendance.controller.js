const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination, isToday, parseSafeDate, isSameDay, formatDateYYYYMMDD } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, ROLES } = require('../config/constants');

// GET attendance (admin: all; coordinator: by dept/date)
exports.getAttendance = catchAsync(async (req, res) => {
  const { department, date, startDate, endDate, student } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let records = await firebaseDb.getAll('attendance');

  if (department) {
    records = records.filter(r => r.departmentId === department);
  }
  if (student) {
    records = records.filter(r => r.studentId === student);
  }
  if (date) {
    records = records.filter(r => isSameDay(r.date, date));
  } else if (startDate && endDate) {
    records = records.filter(r => {
      return (isSameDay(r.date, startDate) || isSameDay(r.date, endDate) || (formatDateYYYYMMDD(r.date) >= formatDateYYYYMMDD(startDate) && formatDateYYYYMMDD(r.date) <= formatDateYYYYMMDD(endDate)));
    });
  }

  records.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Populate student and department
  const students = await firebaseDb.getAll('students');
  const depts = await firebaseDb.getAll('departments');
  const coords = await firebaseDb.getAll('coordinators');

  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });
  const deptMap = {};
  depts.forEach(d => { deptMap[d._id] = d; });
  const coordMap = {};
  coords.forEach(c => { coordMap[c._id] = c; });

  const populated = records.map(r => ({
    ...r,
    student: r.studentId ? (studentMap[r.studentId] ? { _id: r.studentId, name: studentMap[r.studentId].name, registerNumber: studentMap[r.studentId].registerNumber } : null) : null,
    department: r.departmentId ? (deptMap[r.departmentId] || null) : null,
    markedBy: r.markedBy ? (coordMap[r.markedBy] || null) : null,
  }));

  const total = populated.length;
  const paginated = populated.slice(skip, skip + l);

  return sendPaginated(res, 'Attendance fetched', paginated, p, l, total);
});

// GET student attendance summary
exports.getStudentAttendance = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { role, id: userId } = req.user;

  if (role === ROLES.STUDENT && userId.toString() !== studentId.toString()) {
    return sendError(res, 403, 'You can only view your own attendance.');
  }

  let records = await firebaseDb.find('attendance', r => r.studentId === studentId);
  records.sort((a, b) => new Date(b.date) - new Date(a.date));

  const depts = await firebaseDb.getAll('departments');
  const deptMap = {};
  depts.forEach(d => { deptMap[d._id] = d; });

  const populatedRecords = records.map(r => ({
    ...r,
    department: r.departmentId ? (deptMap[r.departmentId] || null) : null
  }));

  const totalSessions = populatedRecords.length;
  const totalPercentage = populatedRecords.reduce((sum, r) => sum + (r.percentage || 0), 0);
  const overallPercentage =
    totalSessions > 0 ? parseFloat((totalPercentage / totalSessions).toFixed(2)) : 0;

  return sendSuccess(res, 200, 'Student attendance fetched', {
    records: populatedRecords,
    summary: {
      totalSessions,
      presentSessions: populatedRecords.filter((r) => r.percentage === 100).length,
      halfSessions: populatedRecords.filter((r) => r.percentage === 50).length,
      absentSessions: populatedRecords.filter((r) => r.percentage === 0).length,
      overallPercentage,
    },
  });
});

// GET department attendance for a date
exports.getDepartmentAttendance = catchAsync(async (req, res) => {
  const { deptId } = req.params;
  const { date } = req.query;

  if (!date) return sendError(res, 400, 'Date parameter is required.');

  const dept = await firebaseDb.getById('departments', deptId);
  const deptCode = dept ? dept.code?.toLowerCase() : null;
  const deptName = dept ? dept.name?.toLowerCase() : null;

  let records = await firebaseDb.find('attendance', r => {
    const isDeptMatch = r.departmentId === deptId || 
                        (deptCode && r.departmentId?.toLowerCase() === deptCode) ||
                        (deptName && r.departmentId?.toLowerCase() === deptName);
    return isDeptMatch && isSameDay(r.date, date);
  });

  const students = await firebaseDb.getAll('students');
  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });

  const populated = records.map(r => ({
    ...r,
    student: r.studentId ? (studentMap[r.studentId] ? { 
      _id: r.studentId, 
      name: studentMap[r.studentId].name, 
      registerNumber: studentMap[r.studentId].registerNumber,
      year: studentMap[r.studentId].year,
      batch: studentMap[r.studentId].batch 
    } : null) : null
  }));

  return sendSuccess(res, 200, 'Department attendance fetched', populated);
});

// POST mark attendance
exports.markAttendance = catchAsync(async (req, res) => {
  const { student, department, date, morningSession, afternoonSession } = req.body;

  if (!student || !department || date === undefined) {
    return sendError(res, 400, 'student, department, and date are required.');
  }

  const attendanceDate = parseSafeDate(date);

  if (req.user.role === ROLES.COORDINATOR && !isToday(attendanceDate)) {
    return sendError(res, 403, 'Coordinators can only mark attendance for today.');
  }

  const studentDoc = await firebaseDb.getById('students', student);
  if (!studentDoc) return sendError(res, 404, 'Student not found.');

  let existing = await firebaseDb.findOne('attendance', r => 
    r.studentId === student && isSameDay(r.date, date)
  );

  const morning = morningSession !== undefined ? morningSession : false;
  const afternoon = afternoonSession !== undefined ? afternoonSession : false;
  let percentage = 0;
  if (morning && afternoon) percentage = 100;
  else if (morning || afternoon) percentage = 50;

  if (existing) {
    if (existing.isLocked && req.user.role !== ROLES.ADMIN) {
      return sendError(res, 403, 'Attendance is locked. Contact admin to unlock.');
    }

    const previousValues = {
      morningSession: existing.morningSession,
      afternoonSession: existing.afternoonSession,
      percentage: existing.percentage,
    };

    const auditTrail = existing.auditTrail || [];
    auditTrail.push({
      action: 'updated',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      performedByName: req.user.name,
      previousValues,
    });

    const updated = await firebaseDb.update('attendance', existing._id, {
      morningSession: morning,
      afternoonSession: afternoon,
      percentage,
      markedBy: req.user.id,
      auditTrail
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.ATTENDANCE,
      entityId: existing._id,
      performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
      ipAddress: req.ip,
      previousData: previousValues,
      description: `Updated attendance for student ${studentDoc.registerNumber} on ${date}`,
    });

    return sendSuccess(res, 200, 'Attendance updated', updated);
  }

  const created = await firebaseDb.create('attendance', {
    studentId: student,
    departmentId: department,
    date: attendanceDate.toISOString(),
    morningSession: morning,
    afternoonSession: afternoon,
    percentage,
    markedBy: req.user.id,
    isLocked: false,
    auditTrail: [{
      action: 'marked',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      performedByName: req.user.name,
    }],
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.ATTENDANCE,
    entityId: created._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Marked attendance for student ${studentDoc.registerNumber} on ${date} — ${created.percentage}%`,
  });

  return sendSuccess(res, 201, 'Attendance marked', created);
});

// POST bulk mark attendance for a department on a date
exports.bulkMarkAttendance = catchAsync(async (req, res) => {
  const { department, date, attendanceData } = req.body;

  if (!department || !date || !Array.isArray(attendanceData)) {
    return sendError(res, 400, 'department, date, and attendanceData array are required.');
  }

  const attendanceDate = parseSafeDate(date);
  if (req.user.role === ROLES.COORDINATOR && !isToday(attendanceDate)) {
    return sendError(res, 403, 'Coordinators can only mark attendance for today.');
  }

  const year = attendanceDate.getFullYear();
  const month = String(attendanceDate.getMonth() + 1).padStart(2, '0');
  const day = String(attendanceDate.getDate()).padStart(2, '0');
  const targetDate = `${year}-${month}-${day}`;
  const now = new Date().toISOString();

  const allRecords = await firebaseDb.getAll('attendance');
  const existingMap = {};
  allRecords.forEach((r) => {
    if (isSameDay(r.date, date)) {
      existingMap[r.studentId] = r;
    }
  });

  const multiUpdates = {};
  const results = { success: 0, failed: 0, errors: [] };

  // 2. Build multi-path update payload in memory (0 network overhead)
  for (const entry of attendanceData) {
    const existing = existingMap[entry.student];

    const morning = entry.morningSession || false;
    const afternoon = entry.afternoonSession || false;
    let percentage = 0;
    if (morning && afternoon) percentage = 100;
    else if (morning || afternoon) percentage = 50;

    if (existing) {
      if (existing.isLocked && req.user.role !== ROLES.ADMIN) {
        results.failed++;
        results.errors.push({ student: entry.student, reason: 'Locked' });
        continue;
      }

      multiUpdates[`attendance/${existing._id}/morningSession`] = morning;
      multiUpdates[`attendance/${existing._id}/afternoonSession`] = afternoon;
      multiUpdates[`attendance/${existing._id}/percentage`] = percentage;
      multiUpdates[`attendance/${existing._id}/markedBy`] = req.user.id;
      multiUpdates[`attendance/${existing._id}/updatedAt`] = now;
    } else {
      const newKey = firebaseDb.getNewKey('attendance');
      multiUpdates[`attendance/${newKey}`] = {
        id: newKey,
        _id: newKey,
        studentId: entry.student,
        departmentId: department,
        date: attendanceDate.toISOString(),
        morningSession: morning,
        afternoonSession: afternoon,
        percentage,
        markedBy: req.user.id,
        isLocked: false,
        createdAt: now,
        updatedAt: now,
        auditTrail: [{
          action: 'bulk-marked',
          performedBy: req.user.id,
          performedByRole: req.user.role,
          performedByName: req.user.name,
        }],
      };
    }
    results.success++;
  }

  // 3. Single atomic multi-path update to Firebase (⚡ BLAZING FAST ~200ms)
  if (Object.keys(multiUpdates).length > 0) {
    await firebaseDb.multiUpdate(multiUpdates);
  }

  // Async Audit Log (no blocking response)
  createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.ATTENDANCE,
    entityId: null,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Bulk attendance: dept=${department}, date=${targetDate}, success=${results.success}, failed=${results.failed}`,
  }).catch(() => {});

  return sendSuccess(res, 200, 'Bulk attendance processed successfully', results);
});

// POST admin unlock attendance
exports.unlockAttendance = catchAsync(async (req, res) => {
  const attendance = await firebaseDb.getById('attendance', req.params.id);
  if (!attendance) return sendError(res, 404, 'Attendance record not found.');

  if (!attendance.isLocked) {
    return sendError(res, 400, 'Attendance is not locked.');
  }

  const auditTrail = attendance.auditTrail || [];
  auditTrail.push({
    action: 'unlocked',
    performedBy: req.user.id,
    performedByRole: req.user.role,
    performedByName: req.user.name,
  });

  const updated = await firebaseDb.update('attendance', req.params.id, {
    isLocked: false,
    unlockedBy: req.user.id,
    unlockedAt: new Date().toISOString(),
    auditTrail
  });

  await createAuditLog({
    action: AUDIT_ACTIONS.UNLOCK,
    entity: AUDIT_ENTITIES.ATTENDANCE,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Admin unlocked attendance record ${req.params.id}`,
  });

  return sendSuccess(res, 200, 'Attendance unlocked successfully.', updated);
});
