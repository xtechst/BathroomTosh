const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Mock user data for initial seeding
const DEMO_USERS = [
  { username: 'admin', password: 'admin123', baseRole: 'TECH_ADMIN' },
  { username: 'manager', password: 'manager123', baseRole: 'MANAGER' },
  { username: 'supervisor', password: 'supervisor123', baseRole: 'SUPERVISOR' },
  { username: 'staff', password: 'staff123', baseRole: 'STAFF' }
];

// Initialize demo users (run once on startup)
const initializeDemoUsers = async () => {
  try {
    // Always delete existing demo users and recreate them
    await User.deleteMany({ username: { $in: ['admin', 'manager', 'supervisor', 'staff'] } });
    
    // Hash passwords before inserting
    for (let user of DEMO_USERS) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
    
    await User.insertMany(DEMO_USERS);
    console.log('✓ Demo users initialized');
  } catch (error) {
    console.error('Error initializing demo users:', error);
  }
};

// Initialize demo tasks
const initializeDemoTasks = async () => {
  try {
    // Wait a bit for users to be created
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const supervisor = await User.findOne({ username: 'supervisor' });
    const staff = await User.findOne({ username: 'staff' });
    
    if (!supervisor || !staff) {
      console.log('Cannot initialize tasks: supervisor or staff not found');
      return;
    }

    // Always delete existing demo tasks
    await Task.deleteMany({
      assignedBy: supervisor._id,
      assignedTo: staff._id
    });

    const demoTasks = [
      {
        title: 'Clean Bathroom Mirrors',
        description: 'Clean all bathroom mirrors with glass cleaner and lint-free cloth',
        area: 'BATHROOM',
        assignedTo: staff._id,
        assignedBy: supervisor._id,
        priority: 'HIGH',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        checklistItems: [
          { name: 'Spray mirror with glass cleaner', isBoolean: true, isToggled: false },
          { name: 'Wipe with lint-free cloth', isBoolean: true, isToggled: false },
          { name: 'Check for streaks', isBoolean: true, isToggled: false },
          { name: 'Dry edges', isBoolean: true, isToggled: false }
        ]
      },
      {
        title: 'Scrub Bathroom Tiles',
        description: 'Scrub all bathroom floor and wall tiles with grout brush',
        area: 'BATHROOM',
        assignedTo: staff._id,
        assignedBy: supervisor._id,
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        checklistItems: [
          { name: 'Wet tiles with water', isBoolean: true, isToggled: false },
          { name: 'Apply bathroom cleaner', isBoolean: true, isToggled: false },
          { name: 'Scrub grout lines', isBoolean: true, isToggled: false },
          { name: 'Rinse thoroughly', isBoolean: true, isToggled: false },
          { name: 'Dry floor', isBoolean: true, isToggled: false }
        ]
      },
      {
        title: 'Clean Bathroom Fixtures',
        description: 'Polish all faucets, shower head, and hinges',
        area: 'BATHROOM',
        assignedTo: staff._id,
        assignedBy: supervisor._id,
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        checklistItems: [
          { name: 'Polish faucet handles', isBoolean: true, isToggled: false },
          { name: 'Clean showerhead', isBoolean: true, isToggled: false },
          { name: 'Polish towel rails', isBoolean: true, isToggled: false },
          { name: 'Check for mineral deposits', isBoolean: true, isToggled: false }
        ]
      },
      {
        title: 'Clean Kitchen Counters',
        description: 'Wipe down all kitchen countertops and remove crumbs',
        area: 'KITCHEN',
        assignedTo: staff._id,
        assignedBy: supervisor._id,
        priority: 'HIGH',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        checklistItems: [
          { name: 'Clear items from counters', isBoolean: true, isToggled: false },
          { name: 'Wipe all surfaces', isBoolean: true, isToggled: false },
          { name: 'Clean backsplash', isBoolean: true, isToggled: false },
          { name: 'Dry surfaces', isBoolean: true, isToggled: false }
        ]
      },
      {
        title: 'Clean Kitchen Sink',
        description: 'Scrub sink and polish faucet',
        area: 'KITCHEN',
        assignedTo: staff._id,
        assignedBy: supervisor._id,
        priority: 'HIGH',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        checklistItems: [
          { name: 'Remove dishes from sink', isBoolean: true, isToggled: false },
          { name: 'Rinse sink', isBoolean: true, isToggled: false },
          { name: 'Scrub with sponge and cleaner', isBoolean: true, isToggled: false },
          { name: 'Polish faucet', isBoolean: true, isToggled: false },
          { name: 'Dry sink', isBoolean: true, isToggled: false }
        ]
      },
      {
        title: 'Mop Kitchen Floor',
        description: 'Sweep and mop the kitchen floor',
        area: 'KITCHEN',
        assignedTo: staff._id,
        assignedBy: supervisor._id,
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        checklistItems: [
          { name: 'Sweep kitchen floor', isBoolean: true, isToggled: false },
          { name: 'Fill mop bucket with water', isBoolean: true, isToggled: false },
          { name: 'Add floor cleaner', isBoolean: true, isToggled: false },
          { name: 'Mop all areas', isBoolean: true, isToggled: false },
          { name: 'Empty water and rinse mop', isBoolean: true, isToggled: false }
        ]
      },
      {
        title: 'Deep Clean Bathroom Shower',
        description: 'Deep clean shower walls, floor, and fixtures',
        area: 'BATHROOM',
        assignedTo: staff._id,
        assignedBy: supervisor._id,
        priority: 'LOW',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        checklistItems: [
          { name: 'Apply shower cleaner to walls', isBoolean: true, isToggled: false },
          { name: 'Let sit for 10 minutes', isBoolean: true, isToggled: false },
          { name: 'Scrub walls and floor', isBoolean: true, isToggled: false },
          { name: 'Clean fixtures and handles', isBoolean: true, isToggled: false },
          { name: 'Rinse thoroughly', isBoolean: true, isToggled: false }
        ]
      }
    ];

    await Task.insertMany(demoTasks);
    console.log(`✓ Demo tasks initialized (${demoTasks.length} tasks created)`);
  } catch (error) {
    console.error('Error initializing demo tasks:', error);
  }
};

// Initialize on module load
initializeDemoUsers();
setTimeout(() => initializeDemoTasks(), 1000);

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password required' 
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        baseRole: user.baseRole 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log login action
    await AuditLog.create({
      action: 'LOGIN',
      actionPerformerId: user._id,
      resourceType: 'USER',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        baseRole: user.baseRole,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Log logout action
    await AuditLog.create({
      action: 'LOGOUT',
      actionPerformerId: req.user.userId,
      resourceType: 'USER',
      resourceId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
