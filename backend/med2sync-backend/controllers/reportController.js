const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

// @desc    Hours report: total logged hours per volunteer, optionally filtered
//          by event/role/date range. This is the "Hours Report" step in the
//          volunteer flow - computed live from Attendance records rather than
//          stored separately, so it's always accurate.
// @route   GET /api/reports/hours
// @access  Private (admin)
exports.hoursReport = async (req, res) => {
  const { volunteerId, from, to } = req.query;

  const match = {
    checkInTime: { $ne: null },
    checkOutTime: { $ne: null },
  };
  if (volunteerId) match.volunteer = new mongoose.Types.ObjectId(volunteerId);
  if (from || to) {
    match.checkInTime = { ...match.checkInTime };
    if (from) match.checkInTime.$gte = new Date(from);
    if (to) match.checkInTime.$lte = new Date(to);
  }

  const report = await Attendance.aggregate([
    { $match: match },
    {
      $addFields: {
        hours: { $divide: [{ $subtract: ['$checkOutTime', '$checkInTime'] }, 1000 * 60 * 60] },
      },
    },
    {
      $group: {
        _id: '$volunteer',
        totalHours: { $sum: '$hours' },
        shiftsCompleted: { $sum: 1 },
      },
    },
    {
      $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'volunteer' },
    },
    { $unwind: '$volunteer' },
    {
      $project: {
        _id: 0,
        volunteerId: '$_id',
        name: '$volunteer.name',
        email: '$volunteer.email',
        totalHours: { $round: ['$totalHours', 2] },
        shiftsCompleted: 1,
      },
    },
    { $sort: { totalHours: -1 } },
  ]);

  res.json(report);
};

// @desc    Logged-in volunteer's own hours report
// @route   GET /api/reports/hours/me
// @access  Private (volunteer)
exports.myHoursReport = async (req, res) => {
  const records = await Attendance.find({
    volunteer: req.user._id,
    checkInTime: { $ne: null },
    checkOutTime: { $ne: null },
  }).populate({ path: 'shiftAssignment', populate: ['event', 'role'] });

  const totalHours = records.reduce((sum, r) => sum + (r.hoursLogged || 0), 0);

  res.json({
    totalHours: Math.round(totalHours * 100) / 100,
    shiftsCompleted: records.length,
    records,
  });
};
