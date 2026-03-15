const express = require('express');
const ActingAssignment = require('../models/ActingAssignment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Initiate acting role delegation
router.post('/', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { delegateUserId, delegatedRole, startTime, endTime, reason } = req.body;

    // Validate delegate
    const delegate = await User.findById(delegateUserId);
    if (!delegate) {
      return res.status(404).json({ success: false, message: 'Delegate user not found' });
    }

    // Cannot delegate to self
    if (delegateUserId === req.user.userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delegate to yourself' });
    }

    const actingAssignment = await ActingAssignment.create({
      delegateUserId,
      originalUserId: req.user.userId,
      delegatedRole,
      status: 'ACTIVE',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      reason,
      createdBy: req.user.userId
    });

    // Log delegation
    await AuditLog.create({
      action: 'INITIATE_ACTING_ROLE',
      actionPerformerId: req.user.userId,
      resourceType: 'ACTING_ASSIGNMENT',
      resourceId: actingAssignment._id.toString(),
      details: { delegatedRole, delegateUserId }
    });

    await actingAssignment.populate(['delegateUserId', 'originalUserId']);
    res.status(201).json({ success: true, message: 'Acting role assigned', actingAssignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get active acting assignments
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const actingAssignments = await ActingAssignment.find({
      status: 'ACTIVE',
      endTime: { $gt: now }
    })
      .populate('delegateUserId', 'username baseRole')
      .populate('originalUserId', 'username baseRole');

    res.json({ success: true, actingAssignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's acting assignments
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const actingAssignments = await ActingAssignment.find({
      $or: [
        { delegateUserId: req.params.userId },
        { originalUserId: req.params.userId }
      ]
    })
      .populate('delegateUserId', 'username baseRole')
      .populate('originalUserId', 'username baseRole')
      .sort({ createdAt: -1 });

    res.json({ success: true, actingAssignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Revoke acting role
router.patch('/:id/revoke', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const actingAssignment = await ActingAssignment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: req.user.userId
      },
      { new: true }
    ).populate(['delegateUserId', 'originalUserId']);

    if (!actingAssignment) {
      return res.status(404).json({ success: false, message: 'Acting assignment not found' });
    }

    // Log revocation
    await AuditLog.create({
      action: 'REVOKE_ACTING_ROLE',
      actionPerformerId: req.user.userId,
      resourceType: 'ACTING_ASSIGNMENT',
      resourceId: actingAssignment._id.toString()
    });

    res.json({ success: true, message: 'Acting role revoked', actingAssignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check and expire old acting assignments (can be called periodically)
router.post('/check-expiry', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const now = new Date();
    const result = await ActingAssignment.updateMany(
      {
        status: 'ACTIVE',
        endTime: { $lte: now }
      },
      { status: 'EXPIRED' }
    );

    res.json({
      success: true,
      message: 'Expiry check completed',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
