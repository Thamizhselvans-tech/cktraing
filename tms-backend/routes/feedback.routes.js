const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/feedback.controller');
const { protect } = require('../middlewares/auth.middleware');
const { adminOnly, studentOnly } = require('../middlewares/role.middleware');

router.get('/', protect, adminOnly, ctrl.getAllFeedback);
router.get('/my', protect, studentOnly, ctrl.getMyFeedback);
router.post('/', protect, studentOnly, ctrl.submitFeedback);
router.put('/:id', protect, studentOnly, ctrl.editFeedback);
router.delete('/:id', protect, adminOnly, ctrl.deleteFeedback);
router.put('/:id/review', protect, adminOnly, ctrl.reviewFeedback);

module.exports = router;
