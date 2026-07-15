const mongoose = require('mongoose');
const { TRAINING_TYPES, FEEDBACK_EDIT_HOURS } = require('../config/constants');

const feedbackSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
      index: true,
    },
    trainingSession: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // Can be null for general feedback
    },
    trainingType: {
      type: String,
      enum: [TRAINING_TYPES.INTERNAL, TRAINING_TYPES.EXTERNAL, TRAINING_TYPES.GENERAL],
      default: TRAINING_TYPES.GENERAL,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    editDeadline: {
      type: Date,
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Set edit deadline on creation (createdAt + 24 hours)
feedbackSchema.pre('save', function (next) {
  if (this.isNew) {
    this.editDeadline = new Date(Date.now() + FEEDBACK_EDIT_HOURS * 60 * 60 * 1000);
  }
  // Auto-expire editability after deadline
  if (this.editDeadline && new Date() > this.editDeadline) {
    this.isEditable = false;
  }
  next();
});

// Compound index: one feedback per student per training session
feedbackSchema.index({ student: 1, trainingSession: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('StudentFeedback', feedbackSchema);
