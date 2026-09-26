const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    message: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// A volunteer can only apply once to the same role
applicationSchema.index({ volunteer: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
