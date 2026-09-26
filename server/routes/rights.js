const express = require('express');
const router = express.Router();
const { protect, rightsYN } = require('../middleware/auth');
const {
    getAllUsers,
    updateUserRights,
    getAllRights,
    getMyRights,
    upsertRight,
} = require('../controllers/rightsController');

router.get('/users', protect, rightsYN, getAllUsers);          // purana CanCncl system
router.put('/users/:id', protect, rightsYN, updateUserRights); // purana CanCncl system

router.get('/all', protect, rightsYN, getAllRights);            // naya rights table
router.get('/my', protect, getMyRights);                     // current user ki apni rights
router.post('/', protect, rightsYN, upsertRight);                // rights assign/update karna

module.exports = router;