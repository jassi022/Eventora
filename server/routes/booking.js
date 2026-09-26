const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { checkRight } = require('../middleware/checkRight');
const { PAGES } = require('../constants');
const {
    bookEvent,
    sendBookingOTP,
    getMyBookings,
    cancelBooking,
    updateBookingStatus,
    getAllBookings,
    adminBookEvent,
    getTicketByCode,
    verifyTicket,
    getScanStats,
    getMyTicketQR,
} = require('../controllers/bookingController');

router.post('/', protect, bookEvent); // Normal user apni khud ki booking karta hai — rights ki zaroorat nahi
router.post('/send-OTP', protect, sendBookingOTP);
router.get('/my', protect, getMyBookings);

router.get('/', protect, checkRight(PAGES.BOOKINGS_MASTER, 'View'), getAllBookings);
router.put('/:id/confirm', protect, checkRight(PAGES.BOOKINGS_MASTER, 'Edit'), updateBookingStatus);
router.delete('/:id', protect, cancelBooking); // apna internal logic hai (isOwner + CanCncl ya isAdmin) — already handle ho raha hai controller ke andar

router.post('/admin', protect, checkRight(PAGES.BOOKINGS_MASTER, 'Add'), adminBookEvent);

router.get('/scan/:tktCod', protect, checkRight(PAGES.SCAN_MASTER, 'View'), getTicketByCode);
router.post('/scan/:tktCod/verify', protect, checkRight(PAGES.SCAN_MASTER, 'Edit'), verifyTicket);
router.get('/scan-stats', protect, checkRight(PAGES.SCAN_MASTER, 'View'), getScanStats);

router.get('/:id/qr', protect, getMyTicketQR); // khud ki booking ka QR — koi extra right nahi chahiye

module.exports = router;