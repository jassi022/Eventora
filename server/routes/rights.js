const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { getAllUsers, updateUserRights } = require('../controllers/rightsController');

router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id', protect, admin, updateUserRights);

module.exports = router;