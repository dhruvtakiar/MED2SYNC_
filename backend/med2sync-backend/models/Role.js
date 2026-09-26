const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    title: { type: String, required: true, trim: true }, // e.g. "Triage Nurse", "First Aid Volunteer"
    description: { type: String, trim: true },
    requiredSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    capacity: { type: Number, required: true, default: 1 },
    filledCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
