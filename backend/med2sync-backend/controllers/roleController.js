const Role = require('../models/Role');
const Event = require('../models/Event');

// @desc    Add a role to an event
// @route   POST /api/events/:eventId/roles
// @access  Private (admin)
exports.createRole = async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const { title, description, requiredSkills, capacity } = req.body;
  const role = await Role.create({
    event: event._id,
    title,
    description,
    requiredSkills,
    capacity,
  });

  res.status(201).json(role);
};

// @desc    List roles for an event
// @route   GET /api/events/:eventId/roles
// @access  Public
exports.listRolesForEvent = async (req, res) => {
  const roles = await Role.find({ event: req.params.eventId }).populate('requiredSkills');
  res.json(roles);
};

// @desc    Get a single role
// @route   GET /api/roles/:id
// @access  Public
exports.getRole = async (req, res) => {
  const role = await Role.findById(req.params.id).populate('requiredSkills').populate('event');
  if (!role) return res.status(404).json({ message: 'Role not found' });
  res.json(role);
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private (admin)
exports.updateRole = async (req, res) => {
  const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!role) return res.status(404).json({ message: 'Role not found' });
  res.json(role);
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private (admin)
exports.deleteRole = async (req, res) => {
  const role = await Role.findByIdAndDelete(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found' });
  res.json({ message: 'Role deleted' });
};
