const Student = require('../models/Student.model');
const Department = require('../models/Department.model');
const DepartmentCoordinator = require('../models/DepartmentCoordinator.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const StudentFeedback = require('../models/StudentFeedback.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { STATUS } = require('../config/constants');

// GET admin dashboard analytics
exports.getDashboardData = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalStudents,
    totalCoordinators,
    totalDepartments,
    todayAttendanceRecords,
    totalMarks,
    totalFeedback,
    unreviewed,
  ] = await Promise.all([
    Student.countDocuments({ status: STATUS.ACTIVE }),
    DepartmentCoordinator.countDocuments({ status: STATUS.ACTIVE }),
    Department.countDocuments({ status: STATUS.ACTIVE }),
    Attendance.find({ date: { $gte: today, $lte: todayEnd } }),
    Marks.find({}),
    StudentFeedback.countDocuments({}),
    StudentFeedback.countDocuments({ isReviewed: false }),
  ]);

  // Today's attendance stats
  const totalTodayRecords = todayAttendanceRecords.length;
  const todayPercentage =
    totalTodayRecords > 0
      ? parseFloat((todayAttendanceRecords.reduce((sum, r) => sum + r.percentage, 0) / totalTodayRecords).toFixed(2))
      : 0;

  // Average marks
  const avgMarks =
    totalMarks.length > 0
      ? parseFloat((totalMarks.reduce((sum, m) => sum + m.average, 0) / totalMarks.length).toFixed(2))
      : 0;

  return sendSuccess(res, 200, 'Dashboard data fetched', {
    totalStudents,
    totalCoordinators,
    totalDepartments,
    todayAttendanceCount: totalTodayRecords,
    todayAttendancePercentage: todayPercentage,
    averageMarks: avgMarks,
    totalFeedback,
    unreviewedFeedback: unreviewed,
  });
});

// GET attendance trend (last 30 days)
exports.getAttendanceTrend = catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await Attendance.aggregate([
    { $match: { date: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        avgPercentage: { $avg: '$percentage' },
        totalStudents: { $sum: 1 },
        presentCount: { $sum: { $cond: [{ $gt: ['$percentage', 0] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return sendSuccess(res, 200, 'Attendance trend fetched', records);
});

// GET department performance
exports.getDepartmentPerformance = catchAsync(async (req, res) => {
  const departments = await Department.find({ status: STATUS.ACTIVE });

  const performance = await Promise.all(
    departments.map(async (dept) => {
      const [attendanceData, marksData] = await Promise.all([
        Attendance.aggregate([
          { $match: { department: dept._id } },
          { $group: { _id: null, avgPercentage: { $avg: '$percentage' }, count: { $sum: 1 } } },
        ]),
        Marks.aggregate([
          { $match: { department: dept._id } },
          { $group: { _id: null, avgTotal: { $avg: '$total' }, avgAverage: { $avg: '$average' }, count: { $sum: 1 } } },
        ]),
      ]);

      return {
        department: { id: dept._id, name: dept.name, code: dept.code },
        attendance: {
          avgPercentage: attendanceData[0]?.avgPercentage?.toFixed(2) || 0,
          count: attendanceData[0]?.count || 0,
        },
        marks: {
          avgTotal: marksData[0]?.avgTotal?.toFixed(2) || 0,
          avgAverage: marksData[0]?.avgAverage?.toFixed(2) || 0,
          count: marksData[0]?.count || 0,
        },
      };
    })
  );

  return sendSuccess(res, 200, 'Department performance fetched', performance);
});

// GET marks analysis
exports.getMarksAnalysis = catchAsync(async (req, res) => {
  const marks = await Marks.find({}).select('mockTest aptitude technical total average');

  const distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
  marks.forEach((m) => {
    const avg = m.average;
    if (avg >= 80) distribution.excellent++;
    else if (avg >= 60) distribution.good++;
    else if (avg >= 40) distribution.average++;
    else distribution.poor++;
  });

  const overall = {
    avgMockTest: marks.length ? parseFloat((marks.reduce((s, m) => s + m.mockTest, 0) / marks.length).toFixed(2)) : 0,
    avgAptitude: marks.length ? parseFloat((marks.reduce((s, m) => s + m.aptitude, 0) / marks.length).toFixed(2)) : 0,
    avgTechnical: marks.length ? parseFloat((marks.reduce((s, m) => s + m.technical, 0) / marks.length).toFixed(2)) : 0,
    avgTotal: marks.length ? parseFloat((marks.reduce((s, m) => s + m.total, 0) / marks.length).toFixed(2)) : 0,
  };

  return sendSuccess(res, 200, 'Marks analysis fetched', { distribution, overall, total: marks.length });
});

// GET feedback analysis
exports.getFeedbackAnalysis = catchAsync(async (req, res) => {
  const ratingDist = await StudentFeedback.aggregate([
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const total = await StudentFeedback.countDocuments();
  const avgRating = await StudentFeedback.aggregate([
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]);

  return sendSuccess(res, 200, 'Feedback analysis fetched', {
    total,
    averageRating: avgRating[0]?.avg?.toFixed(2) || 0,
    distribution: ratingDist,
  });
});
