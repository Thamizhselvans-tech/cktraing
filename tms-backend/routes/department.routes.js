const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/department.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly, adminOrCoordinator } = require('../middlewares/role.middleware');

router.get('/', protect, adminOrCoordinator, ctrl.getAllDepartments);
router.get('/:id', protect, adminOrCoordinator, ctrl.getDepartment);
router.post('/', protect, adminOnly, ctrl.createDepartment);
router.put('/:id', protect, adminOnly, ctrl.updateDepartment);
router.delete('/:id', protect, adminOnly, ctrl.deleteDepartment);

module.exports = router;
