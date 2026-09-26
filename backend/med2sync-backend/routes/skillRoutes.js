const express = require('express');
const { listSkills, createSkill, deleteSkill } = require('../controllers/skillController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', listSkills);
router.post('/', protect, authorize('admin'), createSkill);
router.delete('/:id', protect, authorize('admin'), deleteSkill);

module.exports = router;
