const mongoose = require('mongoose');

const ActingAssignmentSchema = new mongoose.Schema({
  delegateUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  delegatedRole: {
    type: String,
    enum: ['MANAGER', 'SUPERVISOR'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED'],
    default: 'PENDING'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { collection: 'acting_assignments' });

module.exports = mongoose.model('ActingAssignment', ActingAssignmentSchema);
