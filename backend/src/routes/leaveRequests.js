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
      let manager = user.managerId
        ? await User.findOne({ _id: user.managerId, baseRole: 'MANAGER' })
        : null;
      if (!manager) {
        manager = await User.findOne({ baseRole: 'MANAGER' });
      }
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
      const assignedSupervisors = await User.find({
        baseRole: 'SUPERVISOR',
        managerId: req.user.userId
      }).select('_id');

      filter.$or = [
        { escalatedTo: req.user.userId },
        { userId: { $in: assignedSupervisors.map(supervisor => supervisor._id) } }
      ];
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
    if (req.user.baseRole !== 'TECH_ADMIN' && req.user.userId !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'You can only view your own leave requests' });
    }

    const leaveRequests = await LeaveRequest.find({ userId: req.params.userId })
      .populate('userId', 'username baseRole')
      .populate('approvedBy', 'username baseRole')
      .sort({ createdAt: -1 });

    res.json({ success: true, leaveRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve leave requests. Supervisor requests must be handled by a manager or Tech Admin.
router.patch('/:id/approve', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER', 'SUPERVISOR']), async (req, res) => {
  try {
    const { approvalNotes } = req.body;
    const existingRequest = await LeaveRequest.findById(req.params.id);

    if (!existingRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (existingRequest.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: 'Only pending leave requests can be approved' });
    }

    const requester = await User.findById(existingRequest.userId).select('baseRole');
    if (requester?.baseRole === 'SUPERVISOR' && !['TECH_ADMIN', 'MANAGER'].includes(req.user.baseRole)) {
      return res.status(403).json({ success: false, message: 'Supervisor leave must be approved by a manager' });
    }

    if (req.user.baseRole !== 'TECH_ADMIN' && existingRequest.escalatedTo?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This leave request is not assigned to you' });
    }

    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED', approvedBy: req.user.userId, approvalNotes, updatedAt: new Date() },
      { new: true }
    ).populate(['userId', 'approvedBy']);

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

// Reject leave requests. Supervisor requests must be handled by a manager or Tech Admin.
router.patch('/:id/reject', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER', 'SUPERVISOR']), async (req, res) => {
  try {
    const { rejectionNotes } = req.body;
    const existingRequest = await LeaveRequest.findById(req.params.id);

    if (!existingRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (existingRequest.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: 'Only pending leave requests can be rejected' });
    }

    const requester = await User.findById(existingRequest.userId).select('baseRole');
    if (requester?.baseRole === 'SUPERVISOR' && !['TECH_ADMIN', 'MANAGER'].includes(req.user.baseRole)) {
      return res.status(403).json({ success: false, message: 'Supervisor leave must be rejected by a manager' });
    }

    if (req.user.baseRole !== 'TECH_ADMIN' && existingRequest.escalatedTo?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This leave request is not assigned to you' });
    }

    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'REJECTED', approvedBy: req.user.userId, approvalNotes: rejectionNotes, updatedAt: new Date() },
      { new: true }
    ).populate(['userId', 'approvedBy']);

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

// Get leave requests for supervisor's staff
router.get('/supervisor/:supervisorId', authMiddleware, roleMiddleware(['SUPERVISOR']), async (req, res) => {
  try {
    if (req.user.userId !== req.params.supervisorId) {
      return res.status(403).json({ success: false, message: 'You can only view your own staff leave requests' });
    }

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

module.exports = router;
