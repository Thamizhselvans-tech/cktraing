const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');

router.post('/admin/login', authController.adminLogin);
router.post('/coordinator/login', authController.coordinatorLogin);
router.post('/student/login', authController.studentLogin);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.post('/change-password', protect, authController.changePassword);
router.post('/skip-change-password', protect, authController.skipChangePassword);
router.post('/reset-password/:studentId', protect, adminOnly, authController.resetStudentPassword);
router.get('/debug-students', authController.debugStudents);

module.exports = router;
