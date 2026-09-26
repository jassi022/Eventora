const mongoose = require('mongoose');
const crypto = require('crypto');

const Booking = require('../models/Bookings');
const Payment = require('../models/Payment');

const {
    PAYMENT_STATUS,
    BOOKING_STATUS
} = require('../constants');

const { getActivePaymentGateway } = require('../services/paymentGatewayService');

const {
    generateQR,
    generateUPIQR,
    generateInvoicePDF,
    saveInvoiceToDisk
} = require('../utils/ticket');

const {
    sendTicketEmail,
    sendBookingRevertedEmail
} = require('../utils/email');


exports.getPaymentGateway = async (req, res) => {
    try {
        const gateway = await getActivePaymentGateway();
        return res.json({ success: true, gateway });
    } catch (error) {
        console.error('getPaymentGateway:', error);
        return res.status(500).json({ success: false, message: 'Unable to get payment gateway' });
    }
};

exports.getUPIQr = async (req, res) => {
    try {
        const { bookingId } = req.query;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'bookingId is required' });
        }

        const bookingDoc = await Booking.findById(bookingId);

        if (!bookingDoc) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (bookingDoc.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const payeeVPA = process.env.UPI_VPA;             // e.g. "jayeshsharma07@ybl"
        const payeeName = process.env.UPI_PAYEE_NAME || 'Eventora';

        if (!payeeVPA) {
            return res.status(500).json({ success: false, message: 'UPI payee VPA not configured' });
        }

        const qrBuffer = await generateUPIQR(
            bookingDoc.amount,
            bookingDoc._id.toString(),
            payeeVPA,
            payeeName
        );

        return res.json({
            success: true,
            qrImage: `data:image/png;base64,${qrBuffer.toString('base64')}`,
            amount: bookingDoc.amount,
            upiId: payeeVPA
        });

    } catch (error) {
        console.error('getUPIQr:', error);
        return res.status(500).json({ success: false, message: 'Unable to generate UPI QR' });
    }
};

exports.submitUTR = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { bookingId, utr } = req.body;
        const cleanUTR = String(utr || "").trim().toUpperCase();

        if (!bookingId) {
            return res.status(400).json({ success: false, message: "Booking ID is required." });
        }

        if (!cleanUTR || cleanUTR.length < 6) {
            return res.status(400).json({ success: false, message: "A valid UTR is required." });
        }

        const existingPayment = await Payment.findOne({ utr: cleanUTR });

        if (existingPayment) {
            return res.status(400).json({ success: false, message: "This UTR has already been used." });
        }

        const bookingDoc = await Booking.findById(bookingId);

        if (!bookingDoc) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (bookingDoc.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized for this booking." });
        }

        if (bookingDoc.status !== BOOKING_STATUS.PAYMENT_PENDING) {
            return res.status(400).json({
                success: false,
                message: "This booking is not waiting for payment."
            });
        }

        if (bookingDoc.paymentStatus === PAYMENT_STATUS.UTR_SUBMITTED) {
            return res.status(400).json({
                success: false,
                message: "A UTR has already been submitted for this booking. Please wait for verification."
            });
        }

        let payment;

        await session.withTransaction(async () => {

            const duplicate = await Payment.findOne({ utr: cleanUTR }).session(session);

            if (duplicate) {
                throw new Error("This UTR has already been used.");
            }

            payment = await Payment.create(
                [{
                    bookingId: bookingDoc._id,
                    user: req.user._id,
                    amount: bookingDoc.amount,
                    utr: cleanUTR,
                    status: PAYMENT_STATUS.UTR_SUBMITTED,
                    utrSubmittedAt: new Date(),
                    gatewayType: bookingDoc.paymentGateway,
                    paymentGateway: bookingDoc.paymentGateway,
                    userId: req.user._id
                }],
                { session }
            );

            payment = payment[0];

            bookingDoc.paymentStatus = PAYMENT_STATUS.UTR_SUBMITTED;
            await bookingDoc.save({ session });
        });

        // TODO (optional): notify approvers here — everyone with
        // Right.CanApprove on the relevant page (or UsrTyp 500) —
        // that a new UTR is waiting on payment._id.

        return res.status(201).json({
            success: true,
            message: "UTR submitted. Your booking is pending approval.",
            booking: bookingDoc,
            payment
        });

    } catch (error) {
        console.error("submitUTR ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "UTR submission failed."
        });

    } finally {
        await session.endSession();
    }
};

exports.verifyUTR = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId)
            .populate({
                path: 'bookingId',
                populate: [
                    { path: 'eventId' },
                    { path: 'user' },
                    { path: 'PassLines.PassId' }
                ]
            });

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== PAYMENT_STATUS.UTR_SUBMITTED) {
            return res.status(400).json({ success: false, message: 'Payment is not waiting for verification' });
        }

        if (!payment.utr) {
            return res.status(400).json({ success: false, message: 'UTR not found' });
        }

        const booking = payment.bookingId;

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        payment.status = PAYMENT_STATUS.VERIFIED;
        payment.verifiedAt = new Date();
        payment.verifiedBy = req.user._id;
        await payment.save();

        booking.paymentStatus = PAYMENT_STATUS.VERIFIED;
        booking.status = BOOKING_STATUS.CONFIRMED;

        if (!booking.TktCod) {
            booking.TktCod =
                `TKT-${booking._id.toString().slice(-8).toUpperCase()}-${crypto
                    .randomBytes(3)
                    .toString('hex')
                    .toUpperCase()}`;
        }

        booking.TktActive = true;
        booking.TktStat = 410; // not scanned yet

        await booking.save();

        try {
            const event = booking.eventId;

            const passDetailsList = (booking.PassLines || []).map(line => ({
                name: line.PassId?.name || 'Pass',
                qty: line.qty,
                rate: line.rate
            }));

            const buyerInfo = {
                name: booking.user?.name || 'Customer',
                email: booking.user?.email || null,
                phone: booking.user?.phone || null
            };

            const qrBuffer = await generateQR(booking.TktCod);

            const invoiceBuffer = await generateInvoicePDF(
                booking, event, passDetailsList, buyerInfo
            );

            const identifier =
                buyerInfo.phone || buyerInfo.email?.split('@')[0] || booking._id.toString();

            const { filename } = saveInvoiceToDisk(invoiceBuffer, identifier);

            if (buyerInfo.email) {
                await sendTicketEmail({
                    toEmail: buyerInfo.email,
                    name: buyerInfo.name,
                    eventTitle: event?.title,
                    qrBuffer,
                    invoiceBuffer,
                    tktCod: booking.TktCod,
                    invoiceFilename: filename
                });
            }

        } catch (mailError) {
            console.error('Ticket generation/email failed:', mailError);
        }

        return res.json({
            success: true,
            message: 'Payment verified and booking confirmed',
            booking
        });

    } catch (error) {
        console.error('verifyUTR:', error);
        return res.status(500).json({ success: false, message: 'Unable to verify UTR' });
    }
};