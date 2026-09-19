const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { getAllPromos, createPromo, updatePromo, deletePromo, validatePromo } = require('../controllers/promoController');

router.get('/', protect, admin, getAllPromos);
router.post('/', protect, admin, createPromo);
router.put('/:id', protect, admin, updatePromo);
router.delete('/:id', protect, admin, deletePromo);
router.post('/validate', protect, validatePromo);

module.exports = router;