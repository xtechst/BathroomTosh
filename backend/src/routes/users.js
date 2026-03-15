const express = require('express');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Create user (Admin only)
router.post('/', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const { username, password, baseRole, email, firstName, lastName } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    // Validate role
    const validRoles = ['TECH_ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF'];
    if (baseRole && !validRoles.includes(baseRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const newUser = await User.create({
      username,
      password,
      baseRole: baseRole || 'STAFF',
      email,
      firstName,
      lastName
    });

    // Log user creation
    await AuditLog.create({
      action: 'CREATE_USER',
      actionPerformerId: req.user.userId,
      resourceType: 'USER',
      resourceId: newUser._id.toString(),
      details: { username, role: baseRole || 'STAFF' }
    });

    const userResponse = newUser.toJSON();
    res.status(201).json({ success: true, message: 'User created successfully', user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users
router.get('/', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('supervisorId', 'username firstName lastName');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get staff under a supervisor (must come BEFORE /:id route)
router.get('/supervisor/:supervisorId', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER', 'SUPERVISOR']), async (req, res) => {
  try {
    const staff = await User.find({ supervisorId: req.params.supervisorId }).select('-password').populate('supervisorId', 'username firstName lastName');
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('supervisorId', 'username firstName lastName');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user details (Admin only)
router.put('/:id', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const { email, firstName, lastName, baseRole } = req.body;
    const updateData = {};

    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    
    // Only allow role update if explicitly provided
    if (baseRole !== undefined) {
      const validRoles = ['TECH_ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF'];
      if (!validRoles.includes(baseRole)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      updateData.baseRole = baseRole;
    }

    updateData.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password').populate('supervisorId', 'username firstName lastName');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log user update
    await AuditLog.create({
      action: 'UPDATE_USER',
      actionPerformerId: req.user.userId,
      resourceType: 'USER',
      resourceId: user._id.toString(),
      details: updateData
    });

    res.json({ success: true, message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log user deletion
    await AuditLog.create({
      action: 'DELETE_USER',
      actionPerformerId: req.user.userId,
      resourceType: 'USER',
      resourceId: req.params.id,
      details: { username: user.username, role: user.baseRole }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign supervisor to staff (Manager/Admin only)
router.put('/:id/supervisor', authMiddleware, roleMiddleware(['TECH_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { supervisorId } = req.body;

    if (!supervisorId) {
      return res.status(400).json({ success: false, message: 'Supervisor ID is required' });
    }

    // Verify supervisor exists and has proper role
    const supervisor = await User.findById(supervisorId);
    if (!supervisor) {
      return res.status(404).json({ success: false, message: 'Supervisor not found' });
    }

    if (supervisor.baseRole !== 'SUPERVISOR' && supervisor.baseRole !== 'TECH_ADMIN') {
      return res.status(400).json({ success: false, message: 'Selected user is not a supervisor' });
    }

    const staff = await User.findByIdAndUpdate(
      req.params.id,
      { supervisorId, updatedAt: new Date() },
      { new: true }
    ).select('-password').populate('supervisorId', 'username firstName lastName');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Log supervisor assignment
    await AuditLog.create({
      action: 'ASSIGN_SUPERVISOR',
      actionPerformerId: req.user.userId,
      resourceType: 'USER',
      resourceId: staff._id.toString(),
      details: { staffUsername: staff.username, supervisorId, supervisorUsername: supervisor.username }
    });

    res.json({ success: true, message: 'Supervisor assigned successfully', user: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user role (Admin only)
router.put('/:id/role', authMiddleware, roleMiddleware(['TECH_ADMIN']), async (req, res) => {
  try {
    const { baseRole } = req.body;
    const validRoles = ['TECH_ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF'];

    if (!validRoles.includes(baseRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { baseRole, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log role change
    await AuditLog.create({
      action: 'UPDATE_USER_ROLE',
      actionPerformerId: req.user.userId,
      resourceType: 'USER',
      resourceId: user._id.toString(),
      details: { newRole: baseRole, oldRole: user.baseRole }
    });

    res.json({ success: true, message: 'User role updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's effective role (considering acting assignment)
router.get('/:id/effective-role', authMiddleware, async (req, res) => {
  try {
    const ActingAssignment = require('../models/ActingAssignment');
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check for active acting assignment
    const actingAssignment = await ActingAssignment.findOne({
      delegateUserId: req.params.id,
      status: 'ACTIVE',
      endTime: { $gt: new Date() }
    });

    const effectiveRole = actingAssignment ? actingAssignment.delegatedRole : user.baseRole;

    res.json({
      success: true,
      baseRole: user.baseRole,
      effectiveRole,
      actingAssignment: actingAssignment || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
