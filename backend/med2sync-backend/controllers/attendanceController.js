const Attendance = require('../models/Attendance');
const ShiftAssignment = require('../models/ShiftAssignment');

// @desc    Volunteer checks in for a shift
// @route   POST /api/attendance/check-in
// @access  Private (volunteer)
exports.checkIn = async (req, res) => {
  const { shiftAssignmentId } = req.body;

  const shift = await ShiftAssignment.findById(shiftAssignmentId);
  if (!shift) return res.status(404).json({ message: 'Shift assignment not found' });
  if (shift.volunteer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'This shift does not belong to you' });
  }

  const attendance = await Attendance.findOneAndUpdate(
    { shiftAssignment: shift._id },
    { checkInTime: new Date(), status: 'checked-in' },
    { new: true, upsert: true }
  );

  res.json(attendance);
};

// @desc    Volunteer checks out of a shift
// @route   POST /api/attendance/check-out
// @access  Private (volunteer)
exports.checkOut = async (req, res) => {
  const { shiftAssignmentId } = req.body;

  const shift = await ShiftAssignment.findById(shiftAssignmentId);
  if (!shift) return res.status(404).json({ message: 'Shift assignment not found' });
  if (shift.volunteer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'This shift does not belong to you' });
  }

  const attendance = await Attendance.findOne({ shiftAssignment: shift._id });
  if (!attendance || !attendance.checkInTime) {
    return res.status(400).json({ message: 'You must check in before checking out' });
  }

  attendance.checkOutTime = new Date();
  attendance.status = 'checked-out';
  await attendance.save();

  // Mark the shift itself completed
  shift.status = 'completed';
  await shift.save();

  res.json(attendance);
};

// @desc    List attendance records (admin sees all with filters, volunteer sees own)
// @route   GET /api/attendance
// @access  Private
exports.listAttendance = async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { volunteer: req.user._id };
  const { status } = req.query;
  if (status) filter.status = status;

  const records = await Attendance.find(filter)
    .populate('volunteer', 'name email')
    .populate({ path: 'shiftAssignment', populate: ['event', 'role'] });

  res.json(records);
};

// @desc    Admin manually adjusts/marks an attendance record (e.g. mark no-show, fix times)
// @route   PATCH /api/attendance/:id
// @access  Private (admin)
exports.updateAttendance = async (req, res) => {
  const { checkInTime, checkOutTime, status } = req.body;

  const attendance = await Attendance.findByIdAndUpdate(
    req.params.id,
    { checkInTime, checkOutTime, status, markedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
  res.json(attendance);
};
