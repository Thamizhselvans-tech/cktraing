const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { STATUS } = require('../config/constants');

// GET admin dashboard analytics
exports.getDashboardData = catchAsync(async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [
    students,
    coordinators,
    departments,
    attendanceRecords,
    totalMarks,
    feedbackRecords,
  ] = await Promise.all([
    firebaseDb.find('students', s => (s.status || 'Active') === STATUS.ACTIVE),
    firebaseDb.find('coordinators', c => (c.status || 'Active') === STATUS.ACTIVE),
    firebaseDb.find('departments', d => (d.status || 'Active') === STATUS.ACTIVE),
    firebaseDb.getAll('attendance'),
    firebaseDb.getAll('marks'),
    firebaseDb.getAll('feedback'),
  ]);

  const todayAttendance = attendanceRecords.filter(r => r.date && r.date.split('T')[0] === todayStr);

  const totalTodayRecords = todayAttendance.length;
  const todayPercentage =
    totalTodayRecords > 0
      ? parseFloat((todayAttendance.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalTodayRecords).toFixed(2))
      : 0;

  const avgMarks =
    totalMarks.length > 0
      ? parseFloat((totalMarks.reduce((sum, m) => sum + (m.average || 0), 0) / totalMarks.length).toFixed(2))
      : 0;

  const unreviewed = feedbackRecords.filter(f => !f.isReviewed).length;

  return sendSuccess(res, 200, 'Dashboard data fetched', {
    totalStudents: students.length,
    totalCoordinators: coordinators.length,
    totalDepartments: departments.length,
    todayAttendanceCount: totalTodayRecords,
    todayAttendancePercentage: todayPercentage,
    averageMarks: avgMarks,
    totalFeedback: feedbackRecords.length,
    unreviewedFeedback: unreviewed,
  });
});

// GET attendance trend (last 30 days)
exports.getAttendanceTrend = catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await firebaseDb.getAll('attendance');
  const filtered = records.filter(r => new Date(r.date) >= since);

  const grouped = {};
  filtered.forEach(r => {
    const day = r.date ? r.date.split('T')[0] : 'unknown';
    if (!grouped[day]) {
      grouped[day] = { totalPercentage: 0, totalStudents: 0, presentCount: 0 };
    }
    grouped[day].totalPercentage += (r.percentage || 0);
    grouped[day].totalStudents += 1;
    if ((r.percentage || 0) > 0) grouped[day].presentCount += 1;
  });

  const trend = Object.keys(grouped).sort().map(day => ({
    _id: day,
    avgPercentage: parseFloat((grouped[day].totalPercentage / grouped[day].totalStudents).toFixed(2)),
    totalStudents: grouped[day].totalStudents,
    presentCount: grouped[day].presentCount,
  }));

  return sendSuccess(res, 200, 'Attendance trend fetched', trend);
});

// GET department performance
exports.getDepartmentPerformance = catchAsync(async (req, res) => {
  const departments = await firebaseDb.find('departments', d => (d.status || 'Active') === STATUS.ACTIVE);
  const attendanceRecords = await firebaseDb.getAll('attendance');
  const marksRecords = await firebaseDb.getAll('marks');

  const performance = departments.map(dept => {
    const deptAttendance = attendanceRecords.filter(r => r.departmentId === dept._id);
    const deptMarks = marksRecords.filter(m => m.departmentId === dept._id);

    const avgAttendance = deptAttendance.length > 0
      ? parseFloat((deptAttendance.reduce((sum, r) => sum + (r.percentage || 0), 0) / deptAttendance.length).toFixed(2))
      : 0;

    const avgTotalMarks = deptMarks.length > 0
      ? parseFloat((deptMarks.reduce((sum, m) => sum + (m.total || 0), 0) / deptMarks.length).toFixed(2))
      : 0;

    const avgAverageMarks = deptMarks.length > 0
      ? parseFloat((deptMarks.reduce((sum, m) => sum + (m.average || 0), 0) / deptMarks.length).toFixed(2))
      : 0;

    return {
      department: { id: dept._id, name: dept.name, code: dept.code },
      attendance: {
        avgPercentage: avgAttendance,
        count: deptAttendance.length,
      },
      marks: {
        avgTotal: avgTotalMarks,
        avgAverage: avgAverageMarks,
        count: deptMarks.length,
      },
    };
  });

  return sendSuccess(res, 200, 'Department performance fetched', performance);
});

// GET marks analysis
exports.getMarksAnalysis = catchAsync(async (req, res) => {
  const marks = await firebaseDb.getAll('marks');

  const distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
  marks.forEach((m) => {
    const avg = m.average || 0;
    if (avg >= 80) distribution.excellent++;
    else if (avg >= 60) distribution.good++;
    else if (avg >= 40) distribution.average++;
    else distribution.poor++;
  });

  const overall = {
    avgMockTest: marks.length ? parseFloat((marks.reduce((s, m) => s + (m.mockTest || 0), 0) / marks.length).toFixed(2)) : 0,
    avgAptitude: marks.length ? parseFloat((marks.reduce((s, m) => s + (m.aptitude || 0), 0) / marks.length).toFixed(2)) : 0,
    avgTechnical: marks.length ? parseFloat((marks.reduce((s, m) => s + (m.technical || 0), 0) / marks.length).toFixed(2)) : 0,
    avgTotal: marks.length ? parseFloat((marks.reduce((s, m) => s + (m.total || 0), 0) / marks.length).toFixed(2)) : 0,
  };

  return sendSuccess(res, 200, 'Marks analysis fetched', { distribution, overall, total: marks.length });
});

// GET feedback analysis
exports.getFeedbackAnalysis = catchAsync(async (req, res) => {
  const feedback = await firebaseDb.getAll('feedback');

  const ratingCounts = {};
  let totalRating = 0;

  feedback.forEach(f => {
    const r = f.rating || 0;
    ratingCounts[r] = (ratingCounts[r] || 0) + 1;
    totalRating += r;
  });

  const distribution = Object.keys(ratingCounts).sort().map(r => ({
    _id: Number(r),
    count: ratingCounts[r]
  }));

  const averageRating = feedback.length > 0 ? parseFloat((totalRating / feedback.length).toFixed(2)) : 0;

  return sendSuccess(res, 200, 'Feedback analysis fetched', {
    total: feedback.length,
    averageRating,
    distribution,
  });
});
