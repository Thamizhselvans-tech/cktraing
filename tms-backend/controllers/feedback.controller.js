const firebaseDb = require('../services/firebaseDb.service');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { createAuditLog, getPagination } = require('../utils/helpers');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../config/constants');

// GET all feedback (Admin)
exports.getAllFeedback = catchAsync(async (req, res) => {
  const { rating, isReviewed, startDate, endDate } = req.query;
  const { page: p, limit: l, skip } = getPagination(req.query);

  let feedbacks = await firebaseDb.getAll('feedback');

  if (rating) feedbacks = feedbacks.filter(f => Number(f.rating) === Number(rating));
  if (isReviewed !== undefined) feedbacks = feedbacks.filter(f => Boolean(f.isReviewed) === (isReviewed === 'true'));
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    feedbacks = feedbacks.filter(f => {
      const d = new Date(f.createdAt);
      return d >= s && d <= e;
    });
  }

  feedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const students = await firebaseDb.getAll('students');
  const admins = await firebaseDb.getAll('admins');
  const studentMap = {};
  students.forEach(s => { studentMap[s._id] = s; });
  const adminMap = {};
  admins.forEach(a => { adminMap[a._id] = a; });

  const populated = feedbacks.map(f => ({
    ...f,
    student: f.studentId ? (studentMap[f.studentId] ? { _id: f.studentId, name: studentMap[f.studentId].name, registerNumber: studentMap[f.studentId].registerNumber } : null) : null,
    reviewedBy: f.reviewedBy ? (adminMap[f.reviewedBy] ? { _id: f.reviewedBy, name: adminMap[f.reviewedBy].name } : null) : null
  }));

  const total = populated.length;
  const paginated = populated.slice(skip, skip + l);

  return sendPaginated(res, 'Feedback fetched', paginated, p, l, total);
});

// GET own feedback (Student)
exports.getMyFeedback = catchAsync(async (req, res) => {
  let feedbacks = await firebaseDb.find('feedback', f => f.studentId === req.user.id);
  feedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

  if (trainingSession) {
    const existing = await firebaseDb.findOne('feedback', f => f.studentId === req.user.id && f.trainingSession === trainingSession);
    if (existing) {
      return sendError(res, 409, 'You have already submitted feedback for this training session.');
    }
  }

  const feedback = await firebaseDb.create('feedback', {
    studentId: req.user.id,
    rating: Number(rating),
    description: description || '',
    trainingSession: trainingSession || null,
    trainingType: trainingType || 'general',
    isReviewed: false
  });

  return sendSuccess(res, 201, 'Feedback submitted successfully', feedback);
});

// PUT edit feedback (Student)
exports.editFeedback = catchAsync(async (req, res) => {
  const { rating, description } = req.body;
  const feedback = await firebaseDb.getById('feedback', req.params.id);

  if (!feedback) return sendError(res, 404, 'Feedback not found.');
  if (feedback.studentId.toString() !== req.user.id.toString()) {
    return sendError(res, 403, 'You can only edit your own feedback.');
  }

  const updates = {};
  if (rating) {
    if (rating < 1 || rating > 5) return sendError(res, 400, 'Rating must be between 1 and 5.');
    updates.rating = Number(rating);
  }
  if (description !== undefined) {
    if (description.length > 500) return sendError(res, 400, 'Description cannot exceed 500 characters.');
    updates.description = description;
  }

  const updated = await firebaseDb.update('feedback', req.params.id, updates);
  return sendSuccess(res, 200, 'Feedback updated', updated);
});

// DELETE feedback (Admin only)
exports.deleteFeedback = catchAsync(async (req, res) => {
  const feedback = await firebaseDb.getById('feedback', req.params.id);
  if (!feedback) return sendError(res, 404, 'Feedback not found.');

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.FEEDBACK,
    entityId: req.params.id,
    performedBy: { _id: req.user.id, name: req.user.name, role: req.user.role },
    ipAddress: req.ip,
    previousData: feedback,
    description: `Admin deleted feedback ${req.params.id}`,
  });

  await firebaseDb.remove('feedback', req.params.id);
  return sendSuccess(res, 200, 'Feedback deleted.');
});

// PUT mark feedback as reviewed (Admin)
exports.reviewFeedback = catchAsync(async (req, res) => {
  const feedback = await firebaseDb.getById('feedback', req.params.id);
  if (!feedback) return sendError(res, 404, 'Feedback not found.');

  const updated = await firebaseDb.update('feedback', req.params.id, {
    isReviewed: true,
    reviewedBy: req.user.id,
    reviewedAt: new Date().toISOString()
  });

  return sendSuccess(res, 200, 'Feedback marked as reviewed', updated);
});
