const Event = require('../models/Event');
const Role = require('../models/Role');

// @desc    Create an event
// @route   POST /api/events
// @access  Private (admin)
exports.createEvent = async (req, res) => {
  const { title, description, organization, location, startDate, endDate } = req.body;

  const event = await Event.create({
    title,
    description,
    organization,
    location,
    startDate,
    endDate,
    createdBy: req.user._id,
  });

  res.status(201).json(event);
};

// @desc    List events. Volunteers/public only see "open" ones; admins can filter by status.
// @route   GET /api/events
// @access  Public (optional auth)
exports.listEvents = async (req, res) => {
  const { status, location } = req.query;
  const filter = {};

  if (!req.user || req.user.role !== 'admin') {
    filter.status = 'open';
  } else if (status) {
    filter.status = status;
  }
  if (location) filter.location = new RegExp(location, 'i');

  const events = await Event.find(filter).sort('-createdAt');
  res.json(events);
};

// @desc    Get a single event along with its roles
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const roles = await Role.find({ event: event._id }).populate('requiredSkills');
  res.json({ ...event.toObject(), roles });
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (admin)
exports.updateEvent = async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json(event);
};

// @desc    Delete an event (and its roles)
// @route   DELETE /api/events/:id
// @access  Private (admin)
exports.deleteEvent = async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  await Role.deleteMany({ event: event._id });
  res.json({ message: 'Event and its roles deleted' });
};
