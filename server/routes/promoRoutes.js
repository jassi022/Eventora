const express = require('express');
const router = express.Router();
const { protect, rightsYN } = require('../middleware/auth');
const { getAllPromos, createPromo, updatePromo, deletePromo, validatePromo } = require('../controllers/promoController');

router.get('/', protect, rightsYN, getAllPromos);
router.post('/', protect, rightsYN, createPromo);
router.put('/:id', protect, rightsYN , updatePromo);
router.delete('/:id', protect, rightsYN, deletePromo);
router.post('/validate', protect, validatePromo);

module.exports = router;