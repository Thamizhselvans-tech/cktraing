const mongoose = require('mongoose');

const auditTrailEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId },
    performedByRole: { type: String },
    performedByName: { type: String },
    timestamp: { type: Date, default: Date.now },
    previousValues: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    morningSession: {
      type: Boolean,
      required: true,
      default: false, // false = Absent
    },
    afternoonSession: {
      type: Boolean,
      required: true,
      default: false,
    },
    percentage: {
      type: Number,
      enum: [0, 50, 100],
      default: 0,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DepartmentCoordinator',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedAt: {
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
    auditTrail: [auditTrailEntrySchema],
  },
  { timestamps: true }
);

// Unique per student per date
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Auto-calculate percentage before save
attendanceSchema.pre('save', function (next) {
  if (this.morningSession && this.afternoonSession) {
    this.percentage = 100;
  } else if (this.morningSession || this.afternoonSession) {
    this.percentage = 50;
  } else {
    this.percentage = 0;
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
