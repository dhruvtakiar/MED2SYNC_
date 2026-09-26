const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  listVolunteers,
  getVolunteerById,
  verifyVolunteer,
} = require('../controllers/volunteerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/me', protect, authorize('volunteer'), getMyProfile);
router.put('/me', protect, authorize('volunteer'), updateMyProfile);
router.get('/', protect, authorize('admin'), listVolunteers);
router.get('/:id', protect, authorize('admin'), getVolunteerById);
router.patch('/:id/verify', protect, authorize('admin'), verifyVolunteer);

module.exports = router;
