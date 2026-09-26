const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/auth');
const { checkRight } = require('../middleware/checkRight');

const { PAGES } = require('../constants');

const {
    getPaymentGateway,
    getUPIQr,
    submitUTR,
    verifyUTR
} = require('../controllers/paymentController');


// User — active payment gateway
router.get(
    '/gateway',
    protect,
    getPaymentGateway
);


// User — amount-locked UPI QR for a pending booking
router.get(
    '/upi-qr',
    protect,
    getUPIQr
);


// User submits UTR against an existing PAYMENT_PENDING booking
router.post(
    '/utr/submit',
    protect,
    submitUTR
);


// Admin (UsrTyp 500) OR a rights-user (501-999 with CanApprove on
// PAGES.BOOKINGS_MASTER) verifies the UTR and confirms the booking.
// "admin"-only middleware removed on purpose — checkRight already
// bypasses superadmin (UsrTyp 500) internally, and also allows
// rights-users through, which the old "admin" middleware blocked.
router.put( '/utr/:paymentId/verify', protect, checkRight(PAGES.BOOKINGS_MASTER, 'Approve'), verifyUTR );

module.exports = router;