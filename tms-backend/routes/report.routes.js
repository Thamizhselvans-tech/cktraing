const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/report.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');

router.get('/attendance', protect, adminOnly, ctrl.getAttendanceReport);
router.get('/marks', protect, adminOnly, ctrl.getMarksReport);
router.get('/feedback', protect, adminOnly, ctrl.getFeedbackReport);
router.get('/department', protect, adminOnly, ctrl.getDepartmentReport);
router.get('/attendance/download', protect, adminOnly, ctrl.downloadAttendanceReport);
router.get('/marks/download', protect, adminOnly, ctrl.downloadMarksReport);

module.exports = router;
