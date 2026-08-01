const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { sendAttendanceEmailToPrincipal } = require('../services/email.service');
const { createAuditLog, isSameDay, formatDateYYYYMMDD } = require('../utils/helpers');
const { AUDIT_ACTIONS, STATUS } = require('../config/constants');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Helper: Get attendance data
const getAttendanceReportData = async (department, startDate, endDate, studentId) => {
  let records = await firebaseDb.getAll('attendance');

  if (department && department !== 'all') {
    const dept = await firebaseDb.getById('departments', department);
    const deptCode = dept ? dept.code?.toLowerCase() : null;
    const deptName = dept ? dept.name?.toLowerCase() : null;

    records = records.filter(r => 
      r.departmentId === department ||
      (deptCode && r.departmentId?.toLowerCase() === deptCode) ||
      (deptName && r.departmentId?.toLowerCase() === deptName)
    );
  }

  if (studentId) records = records.filter(r => r.studentId === studentId);

  if (startDate && endDate && startDate.split('T')[0] === endDate.split('T')[0]) {
    records = records.filter(r => isSameDay(r.date, startDate));
  } else {
    if (startDate) {
      const sClean = startDate.split('T')[0];
      records = records.filter(r => {
        return isSameDay(r.date, startDate) || formatDateYYYYMMDD(r.date) >= sClean || (r.date && r.date.split('T')[0] >= sClean);
      });
    }

    if (endDate) {
      const eClean = endDate.split('T')[0];
      records = records.filter(r => {
        return isSameDay(r.date, endDate) || formatDateYYYYMMDD(r.date) <= eClean || (r.date && r.date.split('T')[0] <= eClean);
      });
    }
  }

  records.sort((a, b) => new Date(b.date) - new Date(a.date));

  const students = await firebaseDb.getAll('students');
  const depts = await firebaseDb.getAll('departments');
  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });
  const deptMap = {};
  depts.forEach(d => { deptMap[d._id] = d; });

  return records.map(r => ({
    ...r,
    student: r.studentId ? (studentMap[r.studentId] ? { _id: r.studentId, name: studentMap[r.studentId].name, registerNumber: studentMap[r.studentId].registerNumber, year: studentMap[r.studentId].year, batch: studentMap[r.studentId].batch } : null) : null,
    department: r.departmentId ? (deptMap[r.departmentId] || null) : null
  }));
};

// Helper: Get marks data
const getMarksReportData = async (department, studentId) => {
  let records = await firebaseDb.getAll('marks');
  if (department) records = records.filter(m => m.departmentId === department);
  if (studentId) records = records.filter(m => m.studentId === studentId);

  const students = await firebaseDb.getAll('students');
  const depts = await firebaseDb.getAll('departments');
  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });
  const deptMap = {};
  depts.forEach(d => { deptMap[d._id] = d; });

  const populated = records.map(m => ({
    ...m,
    student: m.studentId ? (studentMap[m.studentId] ? { _id: m.studentId, name: studentMap[m.studentId].name, registerNumber: studentMap[m.studentId].registerNumber, year: studentMap[m.studentId].year, batch: studentMap[m.studentId].batch } : null) : null,
    department: m.departmentId ? (deptMap[m.departmentId] || null) : null
  }));

  populated.sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || ''));
  return populated;
};

// GET attendance report
exports.getAttendanceReport = catchAsync(async (req, res) => {
  const { department, startDate, endDate, studentId } = req.query;
  const records = await getAttendanceReportData(department, startDate, endDate, studentId);
  return sendSuccess(res, 200, 'Attendance report data', records);
});

// GET marks report
exports.getMarksReport = catchAsync(async (req, res) => {
  const { department, studentId } = req.query;
  const records = await getMarksReportData(department, studentId);
  return sendSuccess(res, 200, 'Marks report data', records);
});

// GET feedback report
exports.getFeedbackReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  let records = await firebaseDb.getAll('feedback');

  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    records = records.filter(f => {
      const d = new Date(f.createdAt);
      return d >= s && d <= e;
    });
  }

  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const students = await firebaseDb.getAll('students');
  const depts = await firebaseDb.getAll('departments');
  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });
  const deptMap = {};
  depts.forEach(d => { deptMap[d._id] = d; });

  const populated = records.map(f => ({
    ...f,
    student: f.studentId ? (studentMap[f.studentId] ? { 
      _id: f.studentId, 
      name: studentMap[f.studentId].name, 
      registerNumber: studentMap[f.studentId].registerNumber,
      department: studentMap[f.studentId].departmentId ? (deptMap[studentMap[f.studentId].departmentId] || null) : null
    } : null) : null
  }));

  return sendSuccess(res, 200, 'Feedback report data', populated);
});

// GET department report
exports.getDepartmentReport = catchAsync(async (req, res) => {
  const departments = await firebaseDb.getAll('departments');
  const students = await firebaseDb.getAll('students');
  const attendanceRecords = await firebaseDb.getAll('attendance');
  const marksRecords = await firebaseDb.getAll('marks');

  const report = departments.map(dept => {
    const deptStudents = students.filter(s => s.departmentId === dept._id);
    const deptAttendance = attendanceRecords.filter(r => r.departmentId === dept._id);
    const deptMarks = marksRecords.filter(m => m.departmentId === dept._id);

    const avgAttendance = deptAttendance.length > 0
      ? parseFloat((deptAttendance.reduce((sum, r) => sum + (r.percentage || 0), 0) / deptAttendance.length).toFixed(2))
      : 0;

    const avgMarks = deptMarks.length > 0
      ? parseFloat((deptMarks.reduce((sum, m) => sum + (m.average || 0), 0) / deptMarks.length).toFixed(2))
      : 0;

    return {
      _id: dept._id,
      id: dept._id,
      department: dept.name,
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      status: dept.status || 'Active',
      totalStudents: deptStudents.length,
      avgAttendance,
      totalAttendanceRecords: deptAttendance.length,
      avgMarks,
      totalMarksRecords: deptMarks.length,
    };
  });

  return sendSuccess(res, 200, 'Department report', report);
});

// DOWNLOAD: Attendance Excel
exports.downloadAttendanceReport = catchAsync(async (req, res) => {
  const { format = 'excel', department, startDate, endDate } = req.query;
  const records = await getAttendanceReportData(department, startDate, endDate);

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');

    sheet.columns = [
      { header: 'Register No', key: 'regNo', width: 20 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Department', key: 'dept', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Morning', key: 'morning', width: 12 },
      { header: 'Afternoon', key: 'afternoon', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

    records.forEach((r) => {
      sheet.addRow({
        regNo: r.student?.registerNumber || '-',
        name: r.student?.name || '-',
        dept: r.department?.code || '-',
        date: new Date(r.date).toLocaleDateString('en-IN'),
        morning: r.morningSession ? 'Present' : 'Absent',
        afternoon: r.afternoonSession ? 'Present' : 'Absent',
        percentage: `${r.percentage}%`,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
    return;
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    doc.pipe(res);

    doc.fontSize(18).fillColor('#1E3A5F').text('Training Management System', { align: 'center' });
    doc.fontSize(14).fillColor('#333').text('Attendance Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).fillColor('#000');
    const tableTop = doc.y + 10;
    const headers = ['Register No', 'Name', 'Department', 'Date', 'Morning', 'Afternoon', '%'];
    const colWidths = [100, 130, 80, 80, 70, 70, 50];
    let x = 40;

    doc.font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, x, tableTop, { width: colWidths[i] });
      x += colWidths[i];
    });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(760, doc.y).stroke();

    doc.font('Helvetica');
    records.slice(0, 200).forEach((r) => {
      const rowY = doc.y + 5;
      if (rowY > 560) { doc.addPage({ layout: 'landscape' }); }
      x = 40;
      const cols = [
        r.student?.registerNumber || '-',
        r.student?.name?.substring(0, 20) || '-',
        r.department?.code || '-',
        new Date(r.date).toLocaleDateString('en-IN'),
        r.morningSession ? 'P' : 'A',
        r.afternoonSession ? 'P' : 'A',
        `${r.percentage}%`,
      ];
      cols.forEach((col, i) => {
        doc.text(String(col), x, doc.y, { width: colWidths[i] });
        x += colWidths[i];
      });
      doc.moveDown(0.3);
    });

    doc.end();
    return;
  }

  return sendError(res, 400, 'Invalid format. Use excel or pdf.');
});

// DOWNLOAD: Marks Excel
exports.downloadMarksReport = catchAsync(async (req, res) => {
  const { format = 'excel', department } = req.query;
  const records = await getMarksReportData(department);

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Marks Report');

    sheet.columns = [
      { header: 'Register No', key: 'regNo', width: 20 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Department', key: 'dept', width: 15 },
      { header: 'Mock Test', key: 'mockTest', width: 12 },
      { header: 'Aptitude', key: 'aptitude', width: 12 },
      { header: 'Technical', key: 'technical', width: 12 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Average', key: 'average', width: 10 },
      { header: 'Verified', key: 'verified', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

    records.forEach((r) => {
      sheet.addRow({
        regNo: r.student?.registerNumber || '-',
        name: r.student?.name || '-',
        dept: r.department?.code || '-',
        mockTest: r.mockTest || 0,
        aptitude: r.aptitude || 0,
        technical: r.technical || 0,
        total: r.total || 0,
        average: r.average || 0,
        verified: r.isVerified ? 'Yes' : 'No',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=marks_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
    return;
  }

  return sendError(res, 400, 'Invalid format. Use excel or pdf.');
});

// POST send attendance report to principal
exports.sendAttendanceToPrincipal = catchAsync(async (req, res) => {
  const { department, date, principalEmail, customMessage } = req.body;

  if (!department || !principalEmail) {
    return sendError(res, 400, 'Department and Principal Email address are required.');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(principalEmail.trim())) {
    return sendError(res, 400, 'Please enter a valid Principal email address.');
  }

  const dept = await firebaseDb.getById('departments', department);
  if (!dept) return sendError(res, 404, 'Department not found.');

  const reportDate = date ? date.split('T')[0] : formatDateYYYYMMDD(new Date());

  // Fetch attendance records for department & date
  let records = await firebaseDb.getAll('attendance');
  records = records.filter(r => {
    const isDeptMatch = r.departmentId === department ||
                        (dept.code && r.departmentId?.toLowerCase() === dept.code.toLowerCase()) ||
                        (dept.name && r.departmentId?.toLowerCase() === dept.name.toLowerCase());
    return isDeptMatch && isSameDay(r.date, reportDate);
  });

  const students = await firebaseDb.getAll('students');
  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });

  const populated = records.map(r => ({
    ...r,
    student: r.studentId ? (studentMap[r.studentId] ? { _id: r.studentId, name: studentMap[r.studentId].name, registerNumber: studentMap[r.studentId].registerNumber } : null) : null,
  }));

  populated.sort((a, b) => (a.student?.registerNumber || '').localeCompare(b.student?.registerNumber || ''));

  // Calculate department student metrics
  const deptCodeUpper = (dept.code || '').toUpperCase();
  const deptNameUpper = (dept.name || '').toUpperCase();
  const activeDeptStudents = students.filter(s => 
    (s.departmentId === department ||
     s.departmentId === deptCodeUpper ||
     s.departmentId === deptNameUpper) &&
    (s.status || 'Active') === STATUS.ACTIVE
  );

  const totalStudents = activeDeptStudents.length > 0 ? activeDeptStudents.length : populated.length;
  const present = populated.filter(r => (r.morningSession && r.afternoonSession) || r.percentage === 100).length;
  let absent = populated.filter(r => (!r.morningSession && !r.afternoonSession) || r.percentage === 0).length;
  
  if (totalStudents > populated.length) {
    absent = totalStudents - present;
  }

  const percentage = totalStudents > 0 ? parseFloat(((present / totalStudents) * 100).toFixed(2)) : 0;

  const summary = {
    department: dept.name,
    departmentCode: dept.code,
    totalStudents,
    present,
    absent,
    percentage,
  };

  // Dispatch email to principal (non-blocking for instant sub-50ms API response)
  sendAttendanceEmailToPrincipal({
    principalEmail: principalEmail.trim(),
    departmentName: dept.name,
    departmentCode: dept.code,
    date: reportDate,
    records: populated,
    summary,
    customMessage,
    senderName: req.user?.name || req.user?.username || 'Admin',
  }).catch(err => console.error('⚠️ [Email Error] Principal email dispatch failed:', err.message));

  createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    entity: 'PrincipalAttendanceReport',
    entityId: null,
    performedBy: { _id: req.user?.id || 'admin', name: req.user?.name || 'Admin', role: req.user?.role || 'admin' },
    ipAddress: req.ip,
    description: `Sent attendance report for department '${dept.name}' (${reportDate}) to principal email ${principalEmail.trim()}`,
  }).catch(err => console.error('AuditLog error:', err.message));

  return sendSuccess(res, 200, `Attendance report successfully sent to Principal (${principalEmail.trim()})!`, {
    department: dept.name,
    date: reportDate,
    principalEmail: principalEmail.trim(),
    summary,
  });
});
