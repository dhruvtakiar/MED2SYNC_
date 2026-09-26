const express = require('express');
const {
  applyToRole,
  getMyApplications,
  listApplications,
  reviewApplication,
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('volunteer'), applyToRole);
router.get('/me', protect, authorize('volunteer'), getMyApplications);
router.get('/', protect, authorize('admin'), listApplications);
router.patch('/:id', protect, authorize('admin'), reviewApplication);

module.exports = router;
