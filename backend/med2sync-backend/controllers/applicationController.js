const Application = require('../models/Application');
const Role = require('../models/Role');
const Notification = require('../models/Notification');

// @desc    Volunteer applies to a specific role within an event
// @route   POST /api/applications
// @access  Private (volunteer)
exports.applyToRole = async (req, res) => {
  const { roleId, message } = req.body;

  const role = await Role.findById(roleId).populate('event');
  if (!role) return res.status(404).json({ message: 'Role not found' });
  if (role.event.status !== 'open') {
    return res.status(400).json({ message: 'This event is not open for applications' });
  }
  if (role.filledCount >= role.capacity) {
    return res.status(400).json({ message: 'This role is already full' });
  }

  try {
    const application = await Application.create({
      volunteer: req.user._id,
      event: role.event._id,
      role: role._id,
      message,
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already applied to this role' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get the logged-in volunteer's own applications
// @route   GET /api/applications/me
// @access  Private (volunteer)
exports.getMyApplications = async (req, res) => {
  const applications = await Application.find({ volunteer: req.user._id })
    .populate('event')
    .populate('role');
  res.json(applications);
};

// @desc    List applications, optionally filtered by event, role or status
// @route   GET /api/applications
// @access  Private (admin)
exports.listApplications = async (req, res) => {
  const { eventId, roleId, status } = req.query;
  const filter = {};
  if (eventId) filter.event = eventId;
  if (roleId) filter.role = roleId;
  if (status) filter.status = status;

  const applications = await Application.find(filter)
    .populate('volunteer', 'name email')
    .populate('event')
    .populate('role');
  res.json(applications);
};

// @desc    Approve or reject an application
// @route   PATCH /api/applications/:id
// @access  Private (admin)
exports.reviewApplication = async (req, res) => {
  const { status } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "approved" or "rejected"' });
  }

  const application = await Application.findById(req.params.id).populate('role').populate('event');
  if (!application) return res.status(404).json({ message: 'Application not found' });

  if (status === 'approved') {
    if (application.role.filledCount >= application.role.capacity) {
      return res.status(400).json({ message: 'This role is already full' });
    }
    application.role.filledCount += 1;
    await application.role.save();
  }

  application.status = status;
  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();
  await application.save();

  await Notification.create({
    user: application.volunteer,
    title: `Application ${status}`,
    message: `Your application for "${application.role.title}" at "${application.event.title}" was ${status}.`,
    type: status === 'approved' ? 'success' : 'warning',
  });

  res.json(application);
};
