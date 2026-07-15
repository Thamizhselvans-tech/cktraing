const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
      unique: true, // One marks record per student
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    mockTest: {
      type: Number,
      min: [0, 'Mark cannot be negative'],
      max: [100, 'Mark cannot exceed 100'],
      default: 0,
    },
    aptitude: {
      type: Number,
      min: [0, 'Mark cannot be negative'],
      max: [100, 'Mark cannot exceed 100'],
      default: 0,
    },
    technical: {
      type: Number,
      min: [0, 'Mark cannot be negative'],
      max: [100, 'Mark cannot exceed 100'],
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    average: {
      type: Number,
      default: 0,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DepartmentCoordinator',
    },
    isVerified: {
      type: Boolean,
      default: false, // Admin must verify to lock marks
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    unlockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-calculate total and average before save
marksSchema.pre('save', function (next) {
  this.total = (this.mockTest || 0) + (this.aptitude || 0) + (this.technical || 0);
  this.average = parseFloat((this.total / 3).toFixed(2));
  next();
});

module.exports = mongoose.model('Marks', marksSchema);
