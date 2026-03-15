const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all audit logs (Admin only)
router.get('/', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const { actionPerformerId, action, resourceType, startDate, endDate, limit = 100, skip = 0 } = req.query;

    // Build filter
    const filter = {};
    if (actionPerformerId) filter.actionPerformerId = actionPerformerId;
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(filter)
      .populate('actionPerformerId', 'username baseRole')
      .populate('onBehalfOfId', 'username baseRole')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's audit logs
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const logs = await AuditLog.find({
      $or: [
        { actionPerformerId: req.params.userId },
        { onBehalfOfId: req.params.userId }
      ]
    })
      .populate('actionPerformerId', 'username baseRole')
      .populate('onBehalfOfId', 'username baseRole')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search audit logs
router.post('/search', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const { action, resourceType, startDate, endDate, actionPerformerId } = req.body;

    const filter = {};
    if (action) filter.action = new RegExp(action, 'i');
    if (resourceType) filter.resourceType = resourceType;
    if (actionPerformerId) filter.actionPerformerId = actionPerformerId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(filter)
      .populate('actionPerformerId', 'username baseRole')
      .populate('onBehalfOfId', 'username baseRole')
      .sort({ timestamp: -1 })
      .limit(500);

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get audit statistics
router.get('/stats', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
