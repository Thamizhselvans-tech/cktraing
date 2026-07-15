const mongoose = require('mongoose');
const { AUDIT_ACTIONS, ROLES } = require('../config/constants');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: [true, 'Action is required'],
    },
    entity: {
      type: String,
      required: [true, 'Entity is required'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    performedByRole: {
      type: String,
      enum: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.STUDENT],
    },
    performedByName: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    previousData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for fast filtering
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
