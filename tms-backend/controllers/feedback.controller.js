const StudentFeedback = require('../models/StudentFeedback.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES, ROLES, FEEDBACK_EDIT_HOURS } = require('../config/constants');

// GET all feedback (Admin)
exports.getAllFeedback = catchAsync(async (req, res) => {
  const { rating, isReviewed, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  const filter = {};
  if (rating) filter.rating = Number(rating);
  if (isReviewed !== undefined) filter.isReviewed = isReviewed === 'true';
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [feedbacks, total] = await Promise.all([
    StudentFeedback.find(filter)
      .populate('student', 'name registerNumber department')
      .populate('reviewedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l),
    StudentFeedback.countDocuments(filter),
  ]);

  // Update isEditable based on deadline
  const now = new Date();
  feedbacks.forEach((f) => {
    if (f.editDeadline && now > f.editDeadline) f.isEditable = false;
  });

  return sendPaginated(res, 'Feedback fetched', feedbacks, p, l, total);
});

// GET own feedback (Student)
exports.getMyFeedback = catchAsync(async (req, res) => {
  const feedbacks = await StudentFeedback.find({ student: req.user.id })
    .sort({ createdAt: -1 });

  const now = new Date();
  feedbacks.forEach((f) => {
    if (f.editDeadline && now > f.editDeadline) f.isEditable = false;
  });

  return sendSuccess(res, 200, 'Your feedback history', feedbacks);
});

// POST submit feedback (Student)
exports.submitFeedback = catchAsync(async (req, res) => {
  const { rating, description, trainingSession, trainingType } = req.body;

  if (!rating) return sendError(res, 400, 'Rating is required.');
  if (rating < 1 || rating > 5) return sendError(res, 400, 'Rating must be between 1 and 5.');
  if (description && description.length > 500) {
    return sendError(res, 400, 'Description cannot exceed 500 characters.');
  }

  // Check one-feedback-per-training-session constraint
  if (trainingSession) {
    const existing = await StudentFeedback.findOne({
      student: req.user.id,
      trainingSession,
    });
    if (existing) {
      return sendError(res, 409, 'You have already submitted feedback for this training session.');
    }
  }

  const feedback = await StudentFeedback.create({
    student: req.user.id,
    rating,
    description: description || '',
    trainingSession: trainingSession || null,
    trainingType: trainingType || 'general',
  });

  return sendSuccess(res, 201, 'Feedback submitted successfully', feedback);
});

// PUT edit feedback (Student — within 24 hours)
exports.editFeedback = catchAsync(async (req, res) => {
  const { rating, description } = req.body;
  const feedback = await StudentFeedback.findById(req.params.id);

  if (!feedback) return sendError(res, 404, 'Feedback not found.');
  if (feedback.student.toString() !== req.user.id.toString()) {
    return sendError(res, 403, 'You can only edit your own feedback.');
  }

  // Check edit deadline
  if (feedback.editDeadline && new Date() > feedback.editDeadline) {
    return sendError(res, 403, 'Feedback can no longer be edited (24-hour window has passed).');
  }

  if (rating) {
    if (rating < 1 || rating > 5) return sendError(res, 400, 'Rating must be between 1 and 5.');
    feedback.rating = rating;
  }
  if (description !== undefined) {
    if (description.length > 500) return sendError(res, 400, 'Description cannot exceed 500 characters.');
    feedback.description = description;
  }

  await feedback.save();
  return sendSuccess(res, 200, 'Feedback updated', feedback);
});

// DELETE feedback (Admin only)
exports.deleteFeedback = catchAsync(async (req, res) => {
  const feedback = await StudentFeedback.findById(req.params.id);
  if (!feedback) return sendError(res, 404, 'Feedback not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.FEEDBACK,
    entityId: feedback._id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData: feedback.toObject(),
    description: `Admin deleted feedback ${feedback._id}`,
  });

  await feedback.deleteOne();
  return sendSuccess(res, 200, 'Feedback deleted.');
});

// PUT mark feedback as reviewed (Admin)
exports.reviewFeedback = catchAsync(async (req, res) => {
  const feedback = await StudentFeedback.findById(req.params.id);
  if (!feedback) return sendError(res, 404, 'Feedback not found.');

  feedback.isReviewed = true;
  feedback.reviewedBy = req.user.id;
  feedback.reviewedAt = new Date();
  await feedback.save();

  return sendSuccess(res, 200, 'Feedback marked as reviewed', feedback);
});
