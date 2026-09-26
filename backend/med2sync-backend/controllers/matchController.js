const Role = require('../models/Role');
const VolunteerProfile = require('../models/VolunteerProfile');
const { computeMatchScore } = require('../utils/matchingEngine');
const { explainMatch } = require('../utils/aiExplain');

// @desc    Get a ranked list of best-fit verified volunteers for a specific role
// @route   GET /api/match/role/:id
// @access  Private (admin)
exports.matchVolunteersForRole = async (req, res) => {
  const role = await Role.findById(req.params.id).populate('requiredSkills').populate('event');
  if (!role) return res.status(404).json({ message: 'Role not found' });

  const profiles = await VolunteerProfile.find({ isVerified: true })
    .populate('user', 'name email')
    .populate('skills');

  const requiredSkillIds = role.requiredSkills.map((s) => s._id);

  const ranked = await Promise.all(
    profiles.map(async (profile) => {
      const volunteerSkillIds = profile.skills.map((s) => s._id);
      const { score, skillScore, availabilityScore } = computeMatchScore({
        volunteerSkills: volunteerSkillIds,
        volunteerAvailability: profile.availability,
        requiredSkills: requiredSkillIds,
      });

      const explanation = await explainMatch({
        volunteerName: profile.user.name,
        specialization: profile.specialization,
        skillNames: profile.skills.map((s) => s.name),
        opportunityTitle: `${role.title} (${role.event.title})`,
        requiredSkillNames: role.requiredSkills.map((s) => s.name),
        score,
      });

      return {
        volunteer: { id: profile.user._id, name: profile.user.name, email: profile.user.email },
        score,
        skillScore,
        availabilityScore,
        explanation,
      };
    })
  );

  ranked.sort((a, b) => b.score - a.score);
  res.json(ranked);
};

// @desc    Get a ranked list of best-fit open roles for the logged-in volunteer
// @route   GET /api/match/volunteer/me
// @access  Private (volunteer)
exports.matchRolesForVolunteer = async (req, res) => {
  const profile = await VolunteerProfile.findOne({ user: req.user._id }).populate('skills');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  const roles = await Role.find().populate('requiredSkills').populate({
    path: 'event',
    match: { status: 'open' },
  });
  const openRoles = roles.filter((r) => r.event); // drop roles whose event isn't open

  const volunteerSkillIds = profile.skills.map((s) => s._id);

  const ranked = await Promise.all(
    openRoles.map(async (role) => {
      const requiredSkillIds = role.requiredSkills.map((s) => s._id);
      const { score, skillScore, availabilityScore } = computeMatchScore({
        volunteerSkills: volunteerSkillIds,
        volunteerAvailability: profile.availability,
        requiredSkills: requiredSkillIds,
      });

      const explanation = await explainMatch({
        volunteerName: req.user.name,
        specialization: profile.specialization,
        skillNames: profile.skills.map((s) => s.name),
        opportunityTitle: `${role.title} (${role.event.title})`,
        requiredSkillNames: role.requiredSkills.map((s) => s.name),
        score,
      });

      return { role, event: role.event, score, skillScore, availabilityScore, explanation };
    })
  );

  ranked.sort((a, b) => b.score - a.score);
  res.json(ranked);
};
