const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/report.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOrCoordinator } = require('../middlewares/role.middleware');

router.get('/attendance', protect, adminOrCoordinator, ctrl.getAttendanceReport);
router.get('/marks', protect, adminOrCoordinator, ctrl.getMarksReport);
router.get('/feedback', protect, adminOrCoordinator, ctrl.getFeedbackReport);
router.get('/department', protect, adminOrCoordinator, ctrl.getDepartmentReport);
router.get('/attendance/download', protect, adminOrCoordinator, ctrl.downloadAttendanceReport);
router.get('/marks/download', protect, adminOrCoordinator, ctrl.downloadMarksReport);
router.post('/send-principal', protect, adminOrCoordinator, ctrl.sendAttendanceToPrincipal);

module.exports = router;
