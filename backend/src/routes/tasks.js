const express = require('express');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user's tasks
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.userId })
      .populate('assignedTo', 'username baseRole')
      .populate('assignedBy', 'username baseRole');

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create task
router.post('/', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER', 'SUPERVISOR']), async (req, res) => {
  try {
    const { title, description, area, assignedTo, checklistItems, dueDate, priority } = req.body;

    const task = await Task.create({
      title,
      description,
      area,
      assignedTo,
      assignedBy: req.user.userId,
      checklistItems,
      dueDate,
      priority
    });

    // Log task creation
    await AuditLog.create({
      action: 'CREATE_TASK',
      actionPerformerId: req.user.userId,
      resourceType: 'TASK',
      resourceId: task._id.toString(),
      details: { title, area, assignedTo }
    });

    await task.populate(['assignedTo', 'assignedBy']);
    res.status(201).json({ success: true, message: 'Task created', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get task by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'username baseRole')
      .populate('assignedBy', 'username baseRole')
      .populate('notes.userId', 'username baseRole')
      .populate('notes.comments.userId', 'username baseRole');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update task status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Check if all boolean checklist items are toggled before completion
    if (status === 'COMPLETED' && task.checklistItems) {
      const booleanItems = task.checklistItems.filter(item => item.isBoolean);
      const allToggled = booleanItems.every(item => item.isToggled);

      if (!allToggled) {
        return res.status(400).json({
          success: false,
          message: 'Cannot complete task: not all required checklist items are toggled'
        });
      }
    }

    task.status = status;
    if (status === 'COMPLETED') {
      task.completedAt = new Date();
    }
    task.updatedAt = new Date();

    await task.save();

    // Log status change
    await AuditLog.create({
      action: 'UPDATE_TASK_STATUS',
      actionPerformerId: req.user.userId,
      resourceType: 'TASK',
      resourceId: task._id.toString(),
      details: { status }
    });

    res.json({ success: true, message: 'Task status updated', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add note to task
router.post('/:id/notes', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const note = {
      userId: req.user.userId,
      content,
      noteType: req.user.baseRole === 'STAFF' ? 'STAFF_NOTE' : 'FEEDBACK',
      immutable: true,
      createdAt: new Date(),
      comments: []
    };

    task.notes.push(note);
    await task.save();

    // Log note addition
    await AuditLog.create({
      action: 'ADD_TASK_NOTE',
      actionPerformerId: req.user.userId,
      resourceType: 'TASK',
      resourceId: task._id.toString(),
      details: { noteType: note.noteType }
    });

    await task.populate('notes.userId', 'username baseRole');
    res.status(201).json({ success: true, message: 'Note added', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add comment to task note
router.post('/:taskId/notes/:noteId/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const note = task.notes.id(req.params.noteId);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const comment = {
      userId: req.user.userId,
      content,
      parentNoteId: req.params.noteId,
      immutable: true,
      createdAt: new Date()
    };

    note.comments.push(comment);
    await task.save();

    // Log comment addition
    await AuditLog.create({
      action: 'ADD_TASK_COMMENT',
      actionPerformerId: req.user.userId,
      resourceType: 'TASK',
      resourceId: task._id.toString(),
      details: { noteId: req.params.noteId }
    });

    await task.populate(['notes.userId', 'notes.comments.userId']);
    res.status(201).json({ success: true, message: 'Comment added', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete task (Supervisor/Admin only)
router.delete('/:id', authMiddleware, roleMiddleware(['TECH_ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Supervisors can only delete tasks they created
    if (req.user.baseRole === 'SUPERVISOR' && task.assignedBy.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only delete tasks you created' });
    }

    // Log task deletion
    await AuditLog.create({
      action: 'DELETE_TASK',
      actionPerformerId: req.user.userId,
      resourceType: 'TASK',
      resourceId: task._id.toString(),
      details: { title: task.title, area: task.area, assignedTo: task.assignedTo }
    });

    await Task.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;