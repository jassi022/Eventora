const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { getAllPasses, createPass, updatePass, deletePass } = require('../controllers/passController');

router.get('/', protect, admin, getAllPasses);
router.post('/', protect, admin, createPass);
router.put('/:id', protect, admin, updatePass);
router.delete('/:id', protect, admin, deletePass);

module.exports = router;