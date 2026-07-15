const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auditLog.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');

router.get('/', protect, adminOnly, ctrl.getAuditLogs);

module.exports = router;
