const express = require('express');
const {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { createRole, listRolesForEvent } = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Public listing, but if a token IS sent we attach req.user so admins get
// the admin view (all statuses) while everyone else only sees "open" ones.
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (err) {
      req.user = null;
    }
  }
  next();
};

router.get('/', optionalAuth, listEvents);
router.get('/:id', getEvent);
router.post('/', protect, authorize('admin'), createEvent);
router.put('/:id', protect, authorize('admin'), updateEvent);
router.delete('/:id', protect, authorize('admin'), deleteEvent);

// Roles nested under an event
router.get('/:eventId/roles', listRolesForEvent);
router.post('/:eventId/roles', protect, authorize('admin'), createRole);

module.exports = router;
