const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly, adminOrCoordinator, allRoles } = require('../middlewares/role.middleware');
const { handleExcelUpload } = require('../middlewares/upload.middleware');

router.get('/', protect, adminOrCoordinator, ctrl.getAllStudents);
router.get('/department/:deptId', protect, adminOrCoordinator, ctrl.getStudentsByDepartment);
router.get('/excel/files', protect, adminOnly, ctrl.getUploadedFiles);
router.delete('/excel/files/:id', protect, adminOnly, ctrl.deleteUploadedFile);
router.get('/:id', protect, allRoles, ctrl.getStudent);
router.post('/', protect, adminOnly, ctrl.createStudent);
router.post('/upload-excel', protect, adminOnly, handleExcelUpload, ctrl.uploadStudentsExcel);
router.put('/:id', protect, adminOnly, ctrl.updateStudent);
router.delete('/:id', protect, adminOnly, ctrl.deleteStudent);

module.exports = router;
