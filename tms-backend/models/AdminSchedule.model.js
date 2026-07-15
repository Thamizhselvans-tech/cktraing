const mongoose = require('mongoose');
const { SCHEDULE_TYPES, TIMETABLE_STATUS } = require('../config/constants');

const adminScheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(SCHEDULE_TYPES),
      default: SCHEDULE_TYPES.MEETING,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    participants: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(TIMETABLE_STATUS),
      default: TIMETABLE_STATUS.SCHEDULED,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSchedule', adminScheduleSchema);
