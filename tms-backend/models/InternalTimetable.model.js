const mongoose = require('mongoose');
const { TIMETABLE_STATUS } = require('../config/constants');

const internalTimetableSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
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
    venue: {
      type: String,
      trim: true,
    },
    trainer: {
      type: String,
      trim: true,
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

module.exports = mongoose.model('InternalTimetable', internalTimetableSchema);
