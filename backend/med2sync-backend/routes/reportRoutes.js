const express = require('express');
const { hoursReport, myHoursReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/hours', protect, authorize('admin'), hoursReport);
router.get('/hours/me', protect, authorize('volunteer'), myHoursReport);

module.exports = router;
