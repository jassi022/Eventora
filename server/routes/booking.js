const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { bookEvent, sendBookingOTP, getMyBookings, cancelBooking, updateBookingStatus, getAllBookings, adminBookEvent, getTicketByCode, verifyTicket, getScanStats, getMyTicketQR } = require('../controllers/bookingController');



router.post('/', protect, bookEvent); // Create a new booking (accessible to authenticated users)
router.post('/send-OTP', protect, sendBookingOTP); // Send OTP for booking confirmation (accessible to authenticated users)
router.get('/my', protect, getMyBookings);
router.get('/', protect, admin, getAllBookings);
router.put('/:id/confirm', protect, admin, updateBookingStatus); // Confirm a booking (admin only)
router.delete('/:id', protect, cancelBooking); // Cancel a booking (the owning user; ownership checked in the controller)
router.post('/admin', protect, admin, adminBookEvent);
router.get('/scan/:tktCod', protect, admin, getTicketByCode);
router.post('/scan/:tktCod/verify', protect, admin, verifyTicket);
router.get('/scan-stats', protect, admin, getScanStats);
router.get('/:id/qr', protect, getMyTicketQR);
module.exports = router;