const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/coordinator.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/role.middleware');

router.get('/', protect, adminOnly, ctrl.getAllCoordinators);
router.get('/:id', protect, adminOnly, ctrl.getCoordinator);
router.post('/', protect, adminOnly, ctrl.createCoordinator);
router.put('/:id', protect, adminOnly, ctrl.updateCoordinator);
router.delete('/:id', protect, adminOnly, ctrl.deleteCoordinator);

module.exports = router;
