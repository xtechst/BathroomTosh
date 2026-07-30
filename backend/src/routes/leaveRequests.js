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
    const { startDate, endDate, reason, leaveType } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const actingAssignment = await ActingAssignment.findOne({
      delegateUserId: req.user.userId,
      status: 'ACTIVE',
      delegatedRole: 'SUPERVISOR'
    });

    const autoEscalated = !!actingAssignment;
    let escalatedTo = null;
    let status = 'PENDING';
    let approvedBy = null;

    if (user.baseRole === 'TECH_ADMIN') {
      status = 'APPROVED';
      approvedBy = req.user.userId;
    }

    if (autoEscalated) {
      const managers = await User.find({ baseRole: 'MANAGER' });
      if (managers.length > 0) {
        escalatedTo = managers[0]._id;
      }
    } else if (user.baseRole === 'STAFF') {
      escalatedTo = user.supervisorId;
      if (!escalatedTo) {
        const manager = await User.findOne({ baseRole: 'MANAGER' });
        escalatedTo = manager ? manager._id : null;
      }
    } else if (user.baseRole === 'SUPERVISOR') {
      let manager = await User.findOne({ baseRole: 'MANAGER' });
      if (!manager) {
        manager = await User.findOne({ baseRole: 'TECH_ADMIN' });
      }
      escalatedTo = manager ? manager._id : null;
    } else if (user.baseRole === 'MANAGER') {
      const techAdmin = await User.findOne({ baseRole: 'TECH_ADMIN' });
      escalatedTo = techAdmin ? techAdmin._id : null;
    }

    const leaveRequest = await LeaveRequest.create({
      userId: req.user.userId,
      leaveType: leaveType || 'ANNUAL',
      startDate,
      endDate,
      reason,
      autoEscalated,
      escalatedTo,
      status,
      approvedBy
    });

    await AuditLog.create({
      action: status === 'APPROVED' ? 'AUTO_APPROVE_LEAVE_REQUEST' : 'SUBMIT_LEAVE_REQUEST',
      actionPerformerId: req.user.userId,
      resourceType: 'LEAVE_REQUEST',
      resourceId: leaveRequest._id.toString(),
      details: { autoEscalated, escalatedTo, status }
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
    const filter = { status: 'PENDING' };

    if (req.user.baseRole === 'MANAGER') {
      filter.escalatedTo = req.user.userId;
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate('userId', 'username firstName lastName baseRole')
      .populate('escalatedTo', 'username firstName lastName baseRole')
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

// Approve leave request (for supervisors)
router.patch('/:id/approve', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER', 'SUPERVISOR']), async (req, res) => {
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

// Reject leave request (for supervisors and managers)
router.patch('/:id/reject', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER', 'SUPERVISOR']), async (req, res) => {
  try {
    const { rejectionNotes } = req.body;
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'REJECTED',
        approvedBy: req.user.userId,
        approvalNotes: rejectionNotes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate(['userId', 'approvedBy']);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    await AuditLog.create({
      action: 'REJECT_LEAVE_REQUEST',
      actionPerformerId: req.user.userId,
      resourceType: 'LEAVE_REQUEST',
      resourceId: leaveRequest._id.toString(),
      details: { rejectionNotes }
    });

    res.json({ success: true, message: 'Leave request rejected', leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

// Get leave requests for supervisor's staff
router.get('/supervisor/:supervisorId', authMiddleware, roleMiddleware(['SUPERVISOR']), async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({
      escalatedTo: req.params.supervisorId,
      status: 'PENDING'
    })
      .populate('userId', 'username firstName lastName baseRole')
      .sort({ createdAt: -1 });

    res.json({ success: true, leaveRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
