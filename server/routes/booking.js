const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { bookEvent, sendBookingOTP, getMyBookings, cancelBooking, updateBookingStatus, getAllBookings } = require('../controllers/bookingController');



router.post('/', protect, bookEvent); // Create a new booking (accessible to authenticated users)
router.post('/send-OTP', protect, sendBookingOTP); // Send OTP for booking confirmation (accessible to authenticated users)
router.get('/my', protect, getMyBookings);
router.get('/', protect, admin, getAllBookings);
router.put('/:id/confirm', protect, admin, updateBookingStatus); // Confirm a booking (admin only)
router.delete('/:id', protect, cancelBooking); // Cancel a booking (the owning user; ownership checked in the controller)
module.exports = router;