import mongoose from 'mongoose';
import { Application, Attendance, Event, Notification, Role, ShiftAssignment, User, Volunteer } from '../models/index.js';

const fail = (message, code = 'VALIDATION_ERROR') => Object.assign(new Error(message), { code });

export async function submitApplication({ volunteerId, roleId, message = '' }) {
  const volunteer = await Volunteer.findById(volunteerId);
  if (!volunteer || volunteer.verificationStatus !== 'verified') throw fail('A verified volunteer profile is required', 'FORBIDDEN');
  const role = await Role.findOne({ _id: roleId, isActive: true }).populate('eventId');
  if (!role || !role.eventId || role.eventId.status !== 'open' || role.eventId.endDate <= new Date()) throw fail('Role is unavailable for applications', 'CONFLICT');
  if (role.filledCount >= role.capacity) throw fail('Role capacity has been reached', 'CONFLICT');
  const existing = await Application.findOne({ volunteerId, roleId });
  if (existing && ['pending', 'approved'].includes(existing.status)) throw fail('An active application already exists for this role', 'CONFLICT');
  let application;
  try {
    if (existing) {
      existing.eventId = role.eventId._id;
      existing.message = message;
      existing.status = 'pending';
      existing.reviewedBy = undefined;
      existing.reviewedAt = undefined;
      existing.reviewNote = '';
      application = await existing.save();
    } else application = await Application.create({ volunteerId, roleId, eventId: role.eventId._id, message });
  } catch (error) {
    if (error?.code === 11000) throw fail('An application already exists for this role', 'CONFLICT');
    throw error;
  }
  const user = await User.findById(volunteer.userId).select('_id');
  if (user) await Notification.create({ userId: user._id, type: 'info', title: 'Application submitted', message: `Your application for ${role.title} was submitted.`, relatedEntityType: 'application', relatedEntityId: application._id });
  return application;
}

export async function reviewApplication({ applicationId, adminId, decision, reviewNote = '' }) {
  if (!['approved', 'rejected'].includes(decision)) throw fail('Decision must be approved or rejected');
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const application = await Application.findOne({ _id: applicationId, status: 'pending' }).session(session);
      if (!application) throw fail('Pending application not found', 'NOT_FOUND');
      if (decision === 'approved') {
        const role = await Role.findOneAndUpdate({ _id: application.roleId, isActive: true, $expr: { $lt: ['$filledCount', '$capacity'] } }, { $inc: { filledCount: 1 } }, { new: true, session });
        if (!role) throw fail('Role capacity has been reached', 'CONFLICT');
      }
      application.status = decision;
      application.reviewedBy = adminId;
      application.reviewedAt = new Date();
      application.reviewNote = reviewNote;
      await application.save({ session });
      const volunteer = await Volunteer.findById(application.volunteerId).session(session);
      const recipient = volunteer && await User.findById(volunteer.userId).session(session);
      if (recipient) await Notification.create([{ userId: recipient._id, type: decision === 'approved' ? 'success' : 'warning', title: `Application ${decision}`, message: reviewNote || `Your application has been ${decision}.`, relatedEntityType: 'application', relatedEntityId: application._id }], { session });
      result = application;
    });
  } finally { await session.endSession(); }
  return result;
}

export async function assignShift({ applicationId, adminId, shiftStart, shiftEnd }) {
  if (!(shiftStart instanceof Date) || !(shiftEnd instanceof Date) || shiftStart >= shiftEnd) throw fail('Valid shiftStart and shiftEnd are required');
  const application = await Application.findOne({ _id: applicationId, status: 'approved' });
  if (!application) throw fail('Only approved applications can be assigned', 'CONFLICT');
  const overlap = await ShiftAssignment.exists({ volunteerId: application.volunteerId, status: { $ne: 'cancelled' }, shiftStart: { $lt: shiftEnd }, shiftEnd: { $gt: shiftStart } });
  if (overlap) throw fail('Shift overlaps another assignment', 'CONFLICT');
  const assignment = await ShiftAssignment.create({ applicationId, volunteerId: application.volunteerId, eventId: application.eventId, roleId: application.roleId, shiftStart, shiftEnd, assignedBy: adminId });
  const volunteer = await Volunteer.findById(application.volunteerId);
  const recipient = volunteer && await User.findById(volunteer.userId);
  if (recipient) await Notification.create({ userId: recipient._id, type: 'info', title: 'Shift assigned', message: `A shift has been assigned from ${shiftStart.toISOString()} to ${shiftEnd.toISOString()}.`, relatedEntityType: 'shiftAssignment', relatedEntityId: assignment._id });
  return assignment;
}

export async function checkIn({ assignmentId, volunteerId, markedBy }) {
  const assignment = await ShiftAssignment.findOne({ _id: assignmentId, volunteerId, status: { $in: ['scheduled', 'active'] } });
  if (!assignment) throw fail('Shift assignment not found or unavailable', 'NOT_FOUND');
  // The unique shiftAssignmentId index makes concurrent first check-ins safe; an existing
  // check-in is never overwritten. Duplicate-key errors should map to HTTP 409 in the API.
  return Attendance.findOneAndUpdate({ shiftAssignmentId: assignmentId, checkIn: { $exists: false } }, { $setOnInsert: { shiftAssignmentId: assignmentId, volunteerId, status: 'present' }, $set: { checkIn: new Date(), markedBy } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
}

export async function checkOut({ assignmentId, volunteerId, markedBy }) {
  const attendance = await Attendance.findOne({ shiftAssignmentId: assignmentId, volunteerId });
  if (!attendance || !attendance.checkIn) throw fail('Check-in is required before check-out', 'CONFLICT');
  if (attendance.checkOut) throw fail('Attendance has already been checked out', 'CONFLICT');
  attendance.checkOut = new Date();
  attendance.status = 'completed';
  attendance.markedBy = markedBy;
  await attendance.save();
  await ShiftAssignment.updateOne({ _id: assignmentId }, { $set: { status: 'completed' } });
  return attendance;
}

export async function getHoursReport({ volunteerId, from, to } = {}) {
  const match = {};
  if (volunteerId) match.volunteerId = new mongoose.Types.ObjectId(volunteerId);
  if (from || to) match.checkIn = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
  const [summary = { totalHours: 0, completedShifts: 0 }, recentAttendance] = await Promise.all([
    Attendance.aggregate([{ $match: { ...match, status: 'completed' } }, { $group: { _id: null, totalHours: { $sum: '$hoursLogged' }, completedShifts: { $sum: 1 } } }]),
    Attendance.find(match).sort({ checkIn: -1 }).limit(20).populate('shiftAssignmentId', 'eventId roleId shiftStart shiftEnd')
  ]);
  const participation = [...new Set(recentAttendance.map(a => String(a.shiftAssignmentId?.eventId)).filter(Boolean))];
  return { totalHours: summary.totalHours, completedShifts: summary.completedShifts, eventParticipation: participation.length, recentAttendance };
}

export async function markVolunteerVerified({ volunteerId, adminId, status = 'verified' }) {
  if (!['verified', 'rejected'].includes(status)) throw fail('Invalid verification status');
  const volunteer = await Volunteer.findByIdAndUpdate(volunteerId, { verificationStatus: status, verifiedBy: adminId, verifiedAt: new Date() }, { new: true, runValidators: true });
  if (!volunteer) throw fail('Volunteer not found', 'NOT_FOUND');
  await Notification.create({ userId: volunteer.userId, type: status === 'verified' ? 'success' : 'warning', title: `Volunteer ${status}`, message: `Your volunteer profile has been ${status}.`, relatedEntityType: 'volunteer', relatedEntityId: volunteer._id });
  return volunteer;
}

export async function openEvents() { return Event.find({ status: 'open', endDate: { $gt: new Date() } }).sort({ startDate: 1 }); }
