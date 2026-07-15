const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/schedule.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');

// Admin Schedule — Admin only (confidential)
router.get('/', protect, adminOnly, ctrl.getSchedules);
router.post('/', protect, adminOnly, ctrl.createSchedule);
router.put('/:id', protect, adminOnly, ctrl.updateSchedule);
router.delete('/:id', protect, adminOnly, ctrl.deleteSchedule);

module.exports = router;
