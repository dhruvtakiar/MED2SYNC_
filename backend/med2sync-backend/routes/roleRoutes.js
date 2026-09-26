const express = require('express');
const { getRole, updateRole, deleteRole } = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', getRole);
router.put('/:id', protect, authorize('admin'), updateRole);
router.delete('/:id', protect, authorize('admin'), deleteRole);

module.exports = router;
