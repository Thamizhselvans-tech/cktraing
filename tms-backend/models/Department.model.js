const mongoose = require('mongoose');
const { STATUS } = require('../config/constants');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
      default: STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

// Index for faster queries
departmentSchema.index({ status: 1 });

module.exports = mongoose.model('Department', departmentSchema);
