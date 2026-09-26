const Skill = require('../models/Skill');

// @desc    List all skills
// @route   GET /api/skills
// @access  Public (so the frontend can populate dropdowns without auth)
exports.listSkills = async (req, res) => {
  const skills = await Skill.find().sort('name');
  res.json(skills);
};

// @desc    Create a skill
// @route   POST /api/skills
// @access  Private (admin)
exports.createSkill = async (req, res) => {
  const { name, category } = req.body;
  try {
    const skill = await Skill.create({ name, category });
    res.status(201).json(skill);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Skill already exists' });
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a skill
// @route   DELETE /api/skills/:id
// @access  Private (admin)
exports.deleteSkill = async (req, res) => {
  const skill = await Skill.findByIdAndDelete(req.params.id);
  if (!skill) return res.status(404).json({ message: 'Skill not found' });
  res.json({ message: 'Skill deleted' });
};
