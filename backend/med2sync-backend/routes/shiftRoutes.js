const express = require('express');
const {
  createShiftAssignment,
  listShiftAssignments,
  updateShiftStatus,
} = require('../controllers/shiftController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('admin'), createShiftAssignment);
router.get('/', protect, listShiftAssignments); // both roles; controller filters by role
router.patch('/:id', protect, authorize('admin'), updateShiftStatus);

module.exports = router;
