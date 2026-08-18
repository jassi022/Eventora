const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { bookEvent, sendBookingOTP, getMyBookings, cancelBooking, confirmBooking } = require('../controllers/bookingController');



router.post('/', protect, bookEvent); // Create a new booking (accessible to authenticated users)
router.post('/send-OTP', protect, sendBookingOTP); // Send OTP for booking confirmation (accessible to authenticated users)
router.get('/my', protect, getMyBookings);

router.put('/:id/confirm', protect, admin, confirmBooking); // Confirm a booking (accessible to authenticated users)
router.delete('/:id', protect, admin, cancelBooking); // Cancel a booking (accessible to authenticated users)
module.exports = router;
