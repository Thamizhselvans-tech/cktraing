const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analytics.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');

router.get('/dashboard', protect, adminOnly, ctrl.getDashboardData);
router.get('/attendance-trend', protect, adminOnly, ctrl.getAttendanceTrend);
router.get('/department-performance', protect, adminOnly, ctrl.getDepartmentPerformance);
router.get('/marks-analysis', protect, adminOnly, ctrl.getMarksAnalysis);
router.get('/feedback-analysis', protect, adminOnly, ctrl.getFeedbackAnalysis);

module.exports = router;
