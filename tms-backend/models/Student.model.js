const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { STATUS, BCRYPT_ROUNDS } = require('../config/constants');

const studentSchema = new mongoose.Schema(
  {
    registerNumber: {
      type: String,
      required: [true, 'Register number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    mustChangePassword: {
      type: Boolean,
      default: true, // Force password change on first login
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    year: {
      type: Number,
      min: [1, 'Year must be 1-4'],
      max: [4, 'Year must be 1-4'],
    },
    batch: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
      default: STATUS.ACTIVE,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for filtering
studentSchema.index({ department: 1, status: 1 });
studentSchema.index({ registerNumber: 1 });

// Hash password before save
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

// Compare password method
studentSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
