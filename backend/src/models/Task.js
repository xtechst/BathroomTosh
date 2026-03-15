const mongoose = require('mongoose');

const ChecklistItemSchema = new mongoose.Schema({
  name: String,
  isBoolean: Boolean,
  isToggled: Boolean
}, { _id: false });

const TaskNoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: String,
  noteType: {
    type: String,
    enum: ['STAFF_NOTE', 'FEEDBACK'],
    required: true
  },
  immutable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    parentNoteId: mongoose.Schema.Types.ObjectId,
    immutable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    _id: false
  }]
});

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  area: {
    type: String,
    enum: ['KITCHEN', 'BATHROOM'],
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  dueDate: Date,
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  checklistItems: [ChecklistItemSchema],
  isChecklistComplete: {
    type: Boolean,
    default: false
  },
  notes: [TaskNoteSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'tasks' });

module.exports = mongoose.model('Task', TaskSchema);
