const Student = require('../models/Student.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const StudentFeedback = require('../models/StudentFeedback.model');
const Department = require('../models/Department.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ─── Helper: Get attendance data for report ────────────────────────────────────
const getAttendanceReportData = async (filter) => {
  return Attendance.find(filter)
    .populate('student', 'name registerNumber year batch')
    .populate('department', 'name code')
    .sort({ date: -1 });
};

// ─── Helper: Get marks data for report ─────────────────────────────────────────
const getMarksReportData = async (filter) => {
  return Marks.find(filter)
    .populate('student', 'name registerNumber year batch')
    .populate('department', 'name code')
    .sort({ 'student.name': 1 });
};

// GET attendance report (preview)
exports.getAttendanceReport = catchAsync(async (req, res) => {
  const { department, startDate, endDate, studentId } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (studentId) filter.student = studentId;
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const records = await getAttendanceReportData(filter);
  return sendSuccess(res, 200, 'Attendance report data', records);
});

// GET marks report (preview)
exports.getMarksReport = catchAsync(async (req, res) => {
  const { department, studentId } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (studentId) filter.student = studentId;

  const records = await getMarksReportData(filter);
  return sendSuccess(res, 200, 'Marks report data', records);
});

// GET feedback report
exports.getFeedbackReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const records = await StudentFeedback.find(filter)
    .populate('student', 'name registerNumber department')
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, 'Feedback report data', records);
});

// GET department report
exports.getDepartmentReport = catchAsync(async (req, res) => {
  const departments = await Department.find({});
  const report = await Promise.all(
    departments.map(async (dept) => {
      const studentCount = await Student.countDocuments({ department: dept._id });
      const attStats = await Attendance.aggregate([
        { $match: { department: dept._id } },
        { $group: { _id: null, avg: { $avg: '$percentage' }, total: { $sum: 1 } } },
      ]);
      const marksStats = await Marks.aggregate([
        { $match: { department: dept._id } },
        { $group: { _id: null, avg: { $avg: '$average' }, count: { $sum: 1 } } },
      ]);

      return {
        department: dept.name,
        code: dept.code,
        status: dept.status,
        totalStudents: studentCount,
        avgAttendance: attStats[0]?.avg?.toFixed(2) || 0,
        totalAttendanceRecords: attStats[0]?.total || 0,
        avgMarks: marksStats[0]?.avg?.toFixed(2) || 0,
        totalMarksRecords: marksStats[0]?.count || 0,
      };
    })
  );

  return sendSuccess(res, 200, 'Department report', report);
});

// ─── DOWNLOAD: Attendance Excel ─────────────────────────────────────────────────
exports.downloadAttendanceReport = catchAsync(async (req, res) => {
  const { format = 'excel', department, startDate, endDate } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const records = await getAttendanceReportData(filter);

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

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

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

    // Color rows based on percentage
    sheet.eachRow((row, rowNum) => {
      if (rowNum > 1) {
        const pctCell = row.getCell('percentage');
        const pct = parseInt(pctCell.value);
        if (pct === 100) pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        else if (pct === 50) pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
        else pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      }
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

    // Draw headers
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

// ─── DOWNLOAD: Marks Excel ──────────────────────────────────────────────────────
exports.downloadMarksReport = catchAsync(async (req, res) => {
  const { format = 'excel', department } = req.query;
  const filter = {};
  if (department) filter.department = department;

  const records = await getMarksReportData(filter);

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
        mockTest: r.mockTest,
        aptitude: r.aptitude,
        technical: r.technical,
        total: r.total,
        average: r.average,
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
