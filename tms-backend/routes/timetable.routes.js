const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/timetable.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly, allRoles } = require('../middlewares/role.middleware');

// Internal Timetable
router.get('/internal', protect, allRoles, ctrl.getInternalTimetable);
router.post('/internal', protect, adminOnly, ctrl.createInternalTimetable);
router.put('/internal/:id', protect, adminOnly, ctrl.updateInternalTimetable);
router.delete('/internal/:id', protect, adminOnly, ctrl.deleteInternalTimetable);

// External Timetable
router.get('/external', protect, allRoles, ctrl.getExternalTimetable);
router.post('/external', protect, adminOnly, ctrl.createExternalTimetable);
router.put('/external/:id', protect, adminOnly, ctrl.updateExternalTimetable);
router.delete('/external/:id', protect, adminOnly, ctrl.deleteExternalTimetable);

module.exports = router;
