const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    shiftAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftAssignment', required: true, unique: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: { type: String, enum: ['scheduled', 'checked-in', 'checked-out', 'no-show'], default: 'scheduled' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // set if an admin manually adjusted this record
  },
  { timestamps: true }
);

// Virtual: hours logged for this shift, derived from check-in/out (not stored directly,
// so it's always correct even if an admin edits the timestamps later)
attendanceSchema.virtual('hoursLogged').get(function () {
  if (!this.checkInTime || !this.checkOutTime) return 0;
  const ms = this.checkOutTime - this.checkInTime;
  return Math.max(0, Math.round((ms / (1000 * 60 * 60)) * 100) / 100);
});

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
