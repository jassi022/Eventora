const express = require('express');
const router = express.Router();
const {protect, admin} = require('../middleware/auth');
const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');


router.get('/', getAllEvents); // Get all events (accessible to all users)
router.get('/:id', getEventById); // Get event by ID (accessible to all users)
router.post('/', protect, admin, createEvent);  // Create a new event (accessible only to admin users)
router.put('/:id', protect, admin, updateEvent);            
router.delete('/:id', protect, admin, deleteEvent);


module.exports = router;