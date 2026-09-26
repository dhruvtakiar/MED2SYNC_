const express = require('express');
const {
  matchVolunteersForRole,
  matchRolesForVolunteer,
} = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/role/:id', protect, authorize('admin'), matchVolunteersForRole);
router.get('/volunteer/me', protect, authorize('volunteer'), matchRolesForVolunteer);

module.exports = router;
