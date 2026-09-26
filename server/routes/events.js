const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { checkRight } = require('../middleware/checkRight');
const { PAGES } = require('../constants'); // ⬅️ yeh missing tha

const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');

router.post('/', protect, checkRight(PAGES.EVENTS_MASTER, 'Add'), createEvent);
router.put('/:id', protect, checkRight(PAGES.EVENTS_MASTER, 'Edit'), updateEvent);
router.delete('/:id', protect, checkRight(PAGES.EVENTS_MASTER, 'Delete'), deleteEvent);
router.get('/', getAllEvents); // Get all events (accessible to all users)
router.get('/:id', getEventById); // Get event by ID (accessible to all users)

module.exports = router;