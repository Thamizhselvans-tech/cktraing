const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marks.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly, adminOrCoordinator, allRoles } = require('../middlewares/role.middleware');

router.get('/', protect, adminOrCoordinator, ctrl.getAllMarks);
router.get('/student/:studentId', protect, allRoles, ctrl.getStudentMarks);
router.get('/department/:deptId', protect, adminOrCoordinator, ctrl.getDepartmentMarks);
router.post('/', protect, adminOrCoordinator, ctrl.createOrUpdateMarks);
router.post('/:id/verify', protect, adminOnly, ctrl.verifyMarks);
router.post('/:id/unlock', protect, adminOnly, ctrl.unlockMarks);

module.exports = router;
