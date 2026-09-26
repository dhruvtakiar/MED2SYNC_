const VolunteerProfile = require('../models/VolunteerProfile');

// @desc    Get the logged-in volunteer's own profile
// @route   GET /api/volunteers/me
// @access  Private (volunteer)
exports.getMyProfile = async (req, res) => {
  const profile = await VolunteerProfile.findOne({ user: req.user._id }).populate('skills').populate('user', 'name email');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json(profile);
};

// @desc    Update the logged-in volunteer's own profile
// @route   PUT /api/volunteers/me
// @access  Private (volunteer)
exports.updateMyProfile = async (req, res) => {
  const { phone, bio, specialization, yearsOfExperience, skills, availability, location } = req.body;

  const profile = await VolunteerProfile.findOneAndUpdate(
    { user: req.user._id },
    { phone, bio, specialization, yearsOfExperience, skills, availability, location },
    { new: true, upsert: true, runValidators: true }
  ).populate('skills');

  res.json(profile);
};

// @desc    List all volunteer profiles (optionally filter by verified/skill)
// @route   GET /api/volunteers
// @access  Private (admin)
exports.listVolunteers = async (req, res) => {
  const { verified, skill } = req.query;
  const filter = {};
  if (verified !== undefined) filter.isVerified = verified === 'true';
  if (skill) filter.skills = skill;

  const profiles = await VolunteerProfile.find(filter)
    .populate('user', 'name email isActive')
    .populate('skills');

  res.json(profiles);
};

// @desc    Get a single volunteer profile by profile id
// @route   GET /api/volunteers/:id
// @access  Private (admin)
exports.getVolunteerById = async (req, res) => {
  const profile = await VolunteerProfile.findById(req.params.id).populate('user', 'name email').populate('skills');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json(profile);
};

// @desc    Mark a volunteer as verified
// @route   PATCH /api/volunteers/:id/verify
// @access  Private (admin)
exports.verifyVolunteer = async (req, res) => {
  const profile = await VolunteerProfile.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json(profile);
};
