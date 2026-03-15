const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const ActingAssignment = require('../models/ActingAssignment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Submit leave request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;

    // Check if user is acting supervisor
    const actingAssignment = await ActingAssignment.findOne({
      delegateUserId: req.user.userId,
      status: 'ACTIVE',
      delegatedRole: 'SUPERVISOR'
    });

    const autoEscalated = !!actingAssignment;
    let escalatedTo = null;

    if (autoEscalated) {
      // Escalate to the next level up (Manager)
      const managers = await User.find({ baseRole: 'MANAGER' });
      if (managers.length > 0) {
        escalatedTo = managers[0]._id;
      }
    }

    const leaveRequest = await LeaveRequest.create({
      userId: req.user.userId,
      startDate,
      endDate,
      reason,
      autoEscalated,
      escalatedTo
    });

    // Log leave request
    await AuditLog.create({
      action: 'SUBMIT_LEAVE_REQUEST',
      actionPerformerId: req.user.userId,
      resourceType: 'LEAVE_REQUEST',
      resourceId: leaveRequest._id.toString(),
      details: { autoEscalated, escalatedTo }
    });

    await leaveRequest.populate(['userId', 'escalatedTo']);
    res.status(201).json({ success: true, message: 'Leave request submitted', leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get pending leave requests (for managers)
router.get('/pending', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ status: 'PENDING' })
      .populate('userId', 'username baseRole')
      .populate('escalatedTo', 'username baseRole')
      .sort({ createdAt: -1 });

    res.json({ success: true, leaveRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's leave requests
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ userId: req.params.userId })
      .populate('userId', 'username baseRole')
      .populate('approvedBy', 'username baseRole')
      .sort({ createdAt: -1 });

    res.json({ success: true, leaveRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve leave request
router.patch('/:id/approve', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { approvalNotes } = req.body;
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'APPROVED',
        approvedBy: req.user.userId,
        approvalNotes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate(['userId', 'approvedBy']);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Log approval
    await AuditLog.create({
      action: 'APPROVE_LEAVE_REQUEST',
      actionPerformerId: req.user.userId,
      resourceType: 'LEAVE_REQUEST',
      resourceId: leaveRequest._id.toString()
    });

    res.json({ success: true, message: 'Leave request approved', leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reject leave request
router.patch('/:id/reject', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { approvalNotes } = req.body;
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'REJECTED',
        approvalNotes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate(['userId']);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Log rejection
    await AuditLog.create({
      action: 'REJECT_LEAVE_REQUEST',
      actionPerformerId: req.user.userId,
      resourceType: 'LEAVE_REQUEST',
      resourceId: leaveRequest._id.toString()
    });

    res.json({ success: true, message: 'Leave request rejected', leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
