const express = require('express');
const router = express.Router();
const { protect, admin, rightsYN} = require('../middleware/auth');
const { getAllPasses, createPass, updatePass, deletePass, getActivePasses } = require('../controllers/passController');

router.get('/', protect, rightsYN, getAllPasses);
router.post('/', protect, rightsYN, createPass);
router.get('/active', protect, rightsYN, getActivePasses); 
router.put('/:id', protect, rightsYN, updatePass);
router.delete('/:id', protect, rightsYN, deletePass);

module.exports = router;