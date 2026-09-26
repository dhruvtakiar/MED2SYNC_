const express = require('express');
const {
  checkIn,
  checkOut,
  listAttendance,
  updateAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/check-in', protect, authorize('volunteer'), checkIn);
router.post('/check-out', protect, authorize('volunteer'), checkOut);
router.get('/', protect, listAttendance); // both roles; controller filters by role
router.patch('/:id', protect, authorize('admin'), updateAttendance);

module.exports = router;
