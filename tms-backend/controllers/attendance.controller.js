const Attendance = require('../models/Attendance.model');
const Student = require('../models/Student.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination, isToday, getDayRange } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, ROLES } = require('../config/constants');

// GET attendance (admin: all; coordinator: by dept/date)
exports.getAttendance = catchAsync(async (req, res) => {
  const { department, date, startDate, endDate, student } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (department) filter.department = department;
  if (student) filter.student = student;
  if (date) {
    const { start, end } = getDayRange(date);
    filter.date = { $gte: start, $lte: end };
  } else if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'name registerNumber')
      .populate('department', 'name code')
      .populate('markedBy', 'name username')
      .sort({ date: -1 })
      .skip(skip)
      .limit(l),
    Attendance.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Attendance fetched', records, p, l, total);
});

// GET student attendance summary
exports.getStudentAttendance = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { role, id: userId } = req.user;

  // Students can only see their own attendance
  if (role === ROLES.STUDENT && userId.toString() !== studentId.toString()) {
    return sendError(res, 403, 'You can only view your own attendance.');
  }

  const records = await Attendance.find({ student: studentId })
    .sort({ date: -1 })
    .populate('department', 'name code');

  const totalSessions = records.length;
  const totalPercentage = records.reduce((sum, r) => sum + r.percentage, 0);
  const overallPercentage =
    totalSessions > 0 ? parseFloat((totalPercentage / totalSessions).toFixed(2)) : 0;

  return sendSuccess(res, 200, 'Student attendance fetched', {
    records,
    summary: {
      totalSessions,
      presentSessions: records.filter((r) => r.percentage === 100).length,
      halfSessions: records.filter((r) => r.percentage === 50).length,
      absentSessions: records.filter((r) => r.percentage === 0).length,
      overallPercentage,
    },
  });
});

// GET department attendance for a date
exports.getDepartmentAttendance = catchAsync(async (req, res) => {
  const { deptId } = req.params;
  const { date } = req.query;

  if (!date) return sendError(res, 400, 'Date parameter is required.');

  const { start, end } = getDayRange(date);

  const records = await Attendance.find({
    department: deptId,
    date: { $gte: start, $lte: end },
  }).populate('student', 'name registerNumber year batch');

  return sendSuccess(res, 200, 'Department attendance fetched', records);
});

// POST mark attendance
exports.markAttendance = catchAsync(async (req, res) => {
  const { student, department, date, morningSession, afternoonSession } = req.body;

  if (!student || !department || date === undefined) {
    return sendError(res, 400, 'student, department, and date are required.');
  }

  const attendanceDate = new Date(date);

  // Coordinators can only mark today's attendance
  if (req.user.role === ROLES.COORDINATOR && !isToday(attendanceDate)) {
    return sendError(res, 403, 'Coordinators can only mark attendance for today.');
  }

  // Check if student exists
  const studentDoc = await Student.findById(student);
  if (!studentDoc) return sendError(res, 404, 'Student not found.');

  // Check for existing record
  const { start, end } = getDayRange(attendanceDate);
  let existing = await Attendance.findOne({
    student,
    date: { $gte: start, $lte: end },
  });

  if (existing) {
    // Update existing
    if (existing.isLocked && req.user.role !== ROLES.ADMIN) {
      return sendError(res, 403, 'Attendance is locked. Contact admin to unlock.');
    }
    if (!isToday(existing.date) && req.user.role === ROLES.COORDINATOR) {
      return sendError(res, 403, 'Cannot edit past attendance. Contact admin to unlock.');
    }

    const previousValues = {
      morningSession: existing.morningSession,
      afternoonSession: existing.afternoonSession,
      percentage: existing.percentage,
    };

    existing.morningSession = morningSession !== undefined ? morningSession : existing.morningSession;
    existing.afternoonSession = afternoonSession !== undefined ? afternoonSession : existing.afternoonSession;
    existing.markedBy = req.user.id;

    existing.auditTrail.push({
      action: 'updated',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      performedByName: req.user.name,
      previousValues,
    });

    await existing.save();

    await createAuditLog({
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.ATTENDANCE,
      entityId: existing._id,
      performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
      ipAddress: req.ip,
      previousData: previousValues,
      description: `Updated attendance for student ${studentDoc.registerNumber} on ${date}`,
    });

    return sendSuccess(res, 200, 'Attendance updated', existing);
  }

  // Create new attendance record
  const attendance = await Attendance.create({
    student,
    department,
    date: attendanceDate,
    morningSession: morningSession || false,
    afternoonSession: afternoonSession || false,
    markedBy: req.user.id,
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
    entityId: attendance._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Marked attendance for student ${studentDoc.registerNumber} on ${date} — ${attendance.percentage}%`,
  });

  return sendSuccess(res, 201, 'Attendance marked', attendance);
});

// POST bulk mark attendance for a department on a date
exports.bulkMarkAttendance = catchAsync(async (req, res) => {
  const { department, date, attendanceData } = req.body;
  // attendanceData: [{ student, morningSession, afternoonSession }]

  if (!department || !date || !Array.isArray(attendanceData)) {
    return sendError(res, 400, 'department, date, and attendanceData array are required.');
  }

  const attendanceDate = new Date(date);

  if (req.user.role === ROLES.COORDINATOR && !isToday(attendanceDate)) {
    return sendError(res, 403, 'Coordinators can only mark attendance for today.');
  }

  const results = { success: 0, failed: 0, errors: [] };

  for (const entry of attendanceData) {
    try {
      const { start, end } = getDayRange(attendanceDate);
      const existing = await Attendance.findOne({
        student: entry.student,
        date: { $gte: start, $lte: end },
      });

      if (existing) {
        if (existing.isLocked && req.user.role !== ROLES.ADMIN) {
          results.failed++;
          results.errors.push({ student: entry.student, reason: 'Locked' });
          continue;
        }
        existing.morningSession = entry.morningSession;
        existing.afternoonSession = entry.afternoonSession;
        existing.markedBy = req.user.id;
        existing.auditTrail.push({
          action: 'bulk-updated',
          performedBy: req.user.id,
          performedByRole: req.user.role,
          performedByName: req.user.name,
        });
        await existing.save();
      } else {
        await Attendance.create({
          student: entry.student,
          department,
          date: attendanceDate,
          morningSession: entry.morningSession || false,
          afternoonSession: entry.afternoonSession || false,
          markedBy: req.user.id,
          auditTrail: [{
            action: 'bulk-marked',
            performedBy: req.user.id,
            performedByRole: req.user.role,
            performedByName: req.user.name,
          }],
        });
      }
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ student: entry.student, reason: err.message });
    }
  }

  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.ATTENDANCE,
    entityId: null,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Bulk attendance: dept=${department}, date=${date}, success=${results.success}, failed=${results.failed}`,
  });

  return sendSuccess(res, 200, 'Bulk attendance processed', results);
});

// POST admin unlock attendance
exports.unlockAttendance = catchAsync(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) return sendError(res, 404, 'Attendance record not found.');

  if (!attendance.isLocked) {
    return sendError(res, 400, 'Attendance is not locked.');
  }

  attendance.isLocked = false;
  attendance.unlockedBy = req.user.id;
  attendance.unlockedAt = new Date();
  attendance.auditTrail.push({
    action: 'unlocked',
    performedBy: req.user.id,
    performedByRole: req.user.role,
    performedByName: req.user.name,
  });
  await attendance.save();

  await createAuditLog({
    action: AUDIT_ACTIONS.UNLOCK,
    entity: AUDIT_ENTITIES.ATTENDANCE,
    entityId: attendance._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    description: `Admin unlocked attendance record ${attendance._id}`,
  });

  return sendSuccess(res, 200, 'Attendance unlocked successfully.', attendance);
});
