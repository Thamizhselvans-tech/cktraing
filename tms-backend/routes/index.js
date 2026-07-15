const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/departments', require('./department.routes'));
router.use('/students', require('./student.routes'));
router.use('/coordinators', require('./coordinator.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/marks', require('./marks.routes'));
router.use('/feedback', require('./feedback.routes'));
router.use('/timetable', require('./timetable.routes'));
router.use('/schedule', require('./schedule.routes'));
router.use('/reports', require('./report.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/audit-logs', require('./auditLog.routes'));

module.exports = router;
