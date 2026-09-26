const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], required: true },
    startTime: { type: String, required: true }, // e.g. "09:00"
    endTime: { type: String, required: true }, // e.g. "17:00"
  },
  { _id: false }
);

const volunteerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phone: { type: String, trim: true },
    bio: { type: String, trim: true },
    specialization: { type: String, trim: true }, // e.g. "Nurse", "General Physician"
    yearsOfExperience: { type: Number, default: 0 },
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    availability: [availabilitySchema],
    isVerified: { type: Boolean, default: false },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VolunteerProfile', volunteerProfileSchema);
