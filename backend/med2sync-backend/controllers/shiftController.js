const ShiftAssignment = require('../models/ShiftAssignment');
const Attendance = require('../models/Attendance');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

// @desc    Create a shift assignment from an approved application
// @route   POST /api/shifts
// @access  Private (admin)
exports.createShiftAssignment = async (req, res) => {
  const { applicationId, shiftStart, shiftEnd } = req.body;

  const application = await Application.findById(applicationId).populate('event').populate('role');
  if (!application) return res.status(404).json({ message: 'Application not found' });
  if (application.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved applications can be assigned a shift' });
  }

  const shift = await ShiftAssignment.create({
    application: application._id,
    volunteer: application.volunteer,
    event: application.event._id,
    role: application.role._id,
    shiftStart,
    shiftEnd,
    assignedBy: req.user._id,
  });

  // Attendance record starts out "scheduled" and is updated via check-in/check-out
  await Attendance.create({
    shiftAssignment: shift._id,
    volunteer: application.volunteer,
  });

  await Notification.create({
    user: application.volunteer,
    title: 'Shift assigned',
    message: `You've been scheduled for "${application.role.title}" at "${application.event.title}".`,
    type: 'info',
  });

  res.status(201).json(shift);
};

// @desc    List shift assignments (admin sees all, volunteer sees their own)
// @route   GET /api/shifts
// @access  Private
exports.listShiftAssignments = async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { volunteer: req.user._id };
  const shifts = await ShiftAssignment.find(filter)
    .populate('volunteer', 'name email')
    .populate('event')
    .populate('role');
  res.json(shifts);
};

// @desc    Update a shift assignment's status
// @route   PATCH /api/shifts/:id
// @access  Private (admin)
exports.updateShiftStatus = async (req, res) => {
  const { status } = req.body; // 'active' | 'completed' | 'cancelled'
  const shift = await ShiftAssignment.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!shift) return res.status(404).json({ message: 'Shift assignment not found' });
  res.json(shift);
};
