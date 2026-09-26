const express = require('express');
const router = express.Router();
const { protect, rightsYN } = require('../middleware/auth');
const { createStaffUser, getStaffUsers } = require('../controllers/userMasterController');

router.post('/', protect, rightsYN, createStaffUser);
router.get('/', protect, rightsYN, getStaffUsers);

module.exports = router;

