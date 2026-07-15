const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendance.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly, adminOrCoordinator, allRoles } = require('../middlewares/role.middleware');

router.get('/', protect, adminOrCoordinator, ctrl.getAttendance);
router.get('/student/:studentId', protect, allRoles, ctrl.getStudentAttendance);
router.get('/department/:deptId', protect, adminOrCoordinator, ctrl.getDepartmentAttendance);
router.post('/', protect, adminOrCoordinator, ctrl.markAttendance);
router.post('/bulk', protect, adminOrCoordinator, ctrl.bulkMarkAttendance);
router.post('/:id/unlock', protect, adminOnly, ctrl.unlockAttendance);

module.exports = router;
