import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;
const objectId = Schema.Types.ObjectId;
const time = { timestamps: true, versionKey: false };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailPattern, index: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['volunteer', 'admin'], default: 'volunteer', required: true },
  isActive: { type: Boolean, default: true }
}, time);
userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function (candidate) { return bcrypt.compare(candidate, this.password); };
userSchema.set('toJSON', { transform(_doc, ret) { delete ret.password; delete ret.__v; return ret; } });

const skillSchema = new Schema({
  name: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  category: { type: String, trim: true, maxlength: 80, default: 'general' },
  isActive: { type: Boolean, default: true }
}, time);
skillSchema.index({ name: 1 }, { unique: true });

const availabilitySchema = new Schema({
  day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], required: true },
  startTime: { type: String, required: true, match: timePattern },
  endTime: { type: String, required: true, match: timePattern }
}, { _id: false });
availabilitySchema.pre('validate', function () {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) this.invalidate('endTime', 'endTime must be after startTime');
});

const volunteerSchema = new Schema({
  userId: { type: objectId, ref: 'User', required: true, unique: true, index: true },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  bio: { type: String, trim: true, maxlength: 2000, default: '' },
  specialization: { type: String, trim: true, maxlength: 120, default: '' },
  yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
  location: { city: { type: String, trim: true, default: '' }, state: { type: String, trim: true, default: '' } },
  skills: [{ type: objectId, ref: 'Skill' }],
  availability: { type: [availabilitySchema], default: [] },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
  verifiedBy: { type: objectId, ref: 'User' },
  verifiedAt: Date
}, time);

const eventSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  organization: { type: String, required: true, trim: true, maxlength: 160 },
  location: { address: { type: String, trim: true, default: '' }, city: { type: String, trim: true, required: true }, state: { type: String, trim: true, required: true } },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['open', 'closed', 'completed', 'cancelled'], default: 'open', index: true },
  createdBy: { type: objectId, ref: 'User', required: true }
}, time);
eventSchema.pre('validate', function () { if (this.startDate && this.endDate && this.startDate >= this.endDate) this.invalidate('endDate', 'endDate must be after startDate'); });
eventSchema.index({ startDate: 1 });
eventSchema.index({ 'location.city': 1 });

const roleSchema = new Schema({
  eventId: { type: objectId, ref: 'Event', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  requiredSkills: [{ type: objectId, ref: 'Skill' }],
  capacity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  filledCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  isActive: { type: Boolean, default: true }
}, time);
roleSchema.pre('validate', function () { if (this.filledCount > this.capacity) this.invalidate('filledCount', 'filledCount cannot exceed capacity'); });

const applicationSchema = new Schema({
  volunteerId: { type: objectId, ref: 'Volunteer', required: true, index: true },
  eventId: { type: objectId, ref: 'Event', required: true },
  roleId: { type: objectId, ref: 'Role', required: true, index: true },
  message: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], default: 'pending', index: true },
  reviewedBy: { type: objectId, ref: 'User' },
  reviewedAt: Date,
  reviewNote: { type: String, trim: true, maxlength: 2000, default: '' }
}, time);
// One current application per volunteer/role; rejected or withdrawn records can be reopened.
applicationSchema.index({ volunteerId: 1, roleId: 1 }, { unique: true });

const shiftSchema = new Schema({
  applicationId: { type: objectId, ref: 'Application', required: true, unique: true },
  volunteerId: { type: objectId, ref: 'Volunteer', required: true, index: true },
  eventId: { type: objectId, ref: 'Event', required: true, index: true },
  roleId: { type: objectId, ref: 'Role', required: true },
  shiftStart: { type: Date, required: true }, shiftEnd: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  assignedBy: { type: objectId, ref: 'User', required: true }
}, time);
shiftSchema.pre('validate', function () { if (this.shiftStart && this.shiftEnd && this.shiftStart >= this.shiftEnd) this.invalidate('shiftEnd', 'shiftEnd must be after shiftStart'); });
shiftSchema.index({ volunteerId: 1, shiftStart: 1, shiftEnd: 1 });

const attendanceSchema = new Schema({
  shiftAssignmentId: { type: objectId, ref: 'ShiftAssignment', required: true, unique: true },
  volunteerId: { type: objectId, ref: 'Volunteer', required: true, index: true },
  checkIn: Date, checkOut: Date,
  hoursLogged: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['scheduled', 'present', 'completed', 'absent'], default: 'scheduled' },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  markedBy: { type: objectId, ref: 'User' }
}, time);
attendanceSchema.pre('validate', function () {
  if (this.checkIn && this.checkOut) {
    if (this.checkOut < this.checkIn) this.invalidate('checkOut', 'checkOut cannot be before checkIn');
    else this.hoursLogged = Math.round(((this.checkOut - this.checkIn) / 3600000) * 100) / 100;
  } else if (this.checkOut && !this.checkIn) this.invalidate('checkIn', 'checkIn is required when checkOut is set');
  if (this.hoursLogged < 0) this.invalidate('hoursLogged', 'hoursLogged cannot be negative');
});

const notificationSchema = new Schema({
  userId: { type: objectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  relatedEntityType: { type: String, trim: true, maxlength: 60 },
  relatedEntityId: objectId,
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const User = model('User', userSchema, 'users');
export const Volunteer = model('Volunteer', volunteerSchema, 'volunteers');
export const Skill = model('Skill', skillSchema, 'skills');
export const Event = model('Event', eventSchema, 'events');
export const Role = model('Role', roleSchema, 'roles');
export const Application = model('Application', applicationSchema, 'applications');
export const ShiftAssignment = model('ShiftAssignment', shiftSchema, 'shiftAssignments');
export const Attendance = model('Attendance', attendanceSchema, 'attendance');
export const Notification = model('Notification', notificationSchema, 'notifications');
