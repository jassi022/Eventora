const mongoose = require('mongoose');
const booking = require('../models/Bookings');
const OTP = require('../models/OTP');
const Event = require('../models/Event');
const Pass = require('../models/Pass');
const Promo = require('../models/Promo');
const Payment = require('../models/Payment');

const {
    sendOtpEmail,
    sendbookingEmail,
    sendTicketEmail,
    sendBookingRevertedEmail,   // NEW — see utils/email.js note below
} = require('../utils/email');

const crypto = require('crypto');

const {
    generateQR,
    generateInvoicePDF,
    saveInvoiceToDisk,
} = require('../utils/ticket');

const {
    PAYMENT_STATUS,
    BOOKING_STATUS,
} = require('../constants');

const {
    getActivePaymentGateway,
} = require('../services/paymentGatewayService');


const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


/**
 * SEND BOOKING OTP
 */
exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP();
        const { eventId, passLines } = req.body;

        if (!Array.isArray(passLines) || passLines.length === 0) {
            return res.status(400).json({
                message: 'Select at least one pass type'
            });
        }

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: 'Event not found'
            });
        }

        const totalQty = passLines.reduce(
            (sum, line) => sum + Number(line.qty || 0),
            0
        );

        if (totalQty <= 0) {
            return res.status(400).json({
                message: 'Select at least one ticket'
            });
        }

        if (event.availableSeats < totalQty) {
            return res.status(400).json({
                message: 'No available seats for this event'
            });
        }

        // Validate every pass
        for (const line of passLines) {
            const pass = await Pass.findById(line.passId);

            if (!pass || !pass.isActive) {
                return res.status(404).json({
                    message: 'One of the selected passes is not available'
                });
            }

            const qty = Number(line.qty);

            if (qty <= 0) {
                return res.status(400).json({
                    message: `Invalid quantity for ${pass.name}`
                });
            }

            if (qty > pass.MaxPerBook) {
                return res.status(400).json({
                    message: `You can book at most ${pass.MaxPerBook} of ${pass.name} per booking`
                });
            }

            if (pass.AvlblPass < qty) {
                return res.status(400).json({
                    message: `Not enough passes left for ${pass.name}`
                });
            }
        }

        // NOTE: the "already booked this event" duplicate-booking
        // check that used to sit here has been removed, per request —
        // a user can now have multiple bookings for the same event.

        await OTP.findOneAndDelete({
            email: req.user.email,
            action: 'event_booking'
        });

        await OTP.create({
            email: req.user.email,
            otp,
            action: 'event_booking'
        });

        await sendOtpEmail(
            req.user.email,
            otp,
            'event_booking'
        );

        res.status(200).json({
            message: 'OTP sent to your email for booking confirmation'
        });

    } catch (error) {
        console.error('sendBookingOTP ERROR:', error);

        res.status(500).json({
            message: 'Error sending OTP',
            error: error.message
        });
    }
};


/**
 * BOOK EVENT
 * Verifies OTP, reserves stock/seats, and creates the Booking as
 * PAYMENT_PENDING. Payment (UTR submit) and approval happen through
 * paymentController.submitUTR / verifyUTR.
 */
exports.bookEvent = async (req, res) => {
    try {
        const {
            eventId,
            otp,
            passLines,
            promoCode
        } = req.body;

        if (!Array.isArray(passLines) || passLines.length === 0) {
            return res.status(400).json({
                message: 'Select at least one pass type'
            });
        }

        const otpRecord = await OTP.findOne({
            email: req.user.email,
            otp,
            action: 'event_booking'
        });

        if (!otpRecord) {
            return res.status(400).json({
                message: 'Invalid or expired OTP'
            });
        }

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: 'Event not found'
            });
        }

        const totalQty = passLines.reduce(
            (sum, line) => sum + Number(line.qty || 0),
            0
        );

        if (totalQty <= 0) {
            return res.status(400).json({
                message: 'Select at least one ticket'
            });
        }

        if (event.availableSeats < totalQty) {
            return res.status(400).json({
                message: 'No available seats for this event'
            });
        }

        // Build booking lines
        const builtLines = [];
        let baseAmount = 0;

        for (const line of passLines) {
            const pass = await Pass.findById(line.passId);

            if (!pass || !pass.isActive) {
                return res.status(404).json({
                    message: 'One of the selected passes is not available'
                });
            }

            const qty = Number(line.qty);

            if (qty <= 0) {
                return res.status(400).json({
                    message: `Invalid quantity for ${pass.name}`
                });
            }

            if (qty > pass.MaxPerBook) {
                return res.status(400).json({
                    message: `You can book at most ${pass.MaxPerBook} of ${pass.name} per booking`
                });
            }

            if (pass.AvlblPass < qty) {
                return res.status(400).json({
                    message: `Not enough passes left for ${pass.name}`
                });
            }

            builtLines.push({
                PassId: pass._id,
                qty,
                rate: pass.price
            });

            baseAmount += pass.price * qty;
        }

        // Promo
        let discount = 0;
        let appliedCode = null;

        if (promoCode) {
            const promo = await Promo.findOne({
                Cod: promoCode.trim().toUpperCase()
            });

            if (
                promo &&
                promo.IsActv &&
                new Date(promo.ExpDt) >= new Date() &&
                baseAmount >= promo.MinAmt
            ) {
                discount =
                    promo.Typ === 'percent'
                        ? Math.round((baseAmount * promo.Val) / 100)
                        : Math.min(promo.Val, baseAmount);

                appliedCode = promo.Cod;
            }
        }

        const gatewayType = await getActivePaymentGateway();

        // Create the real Booking row now, as PAYMENT_PENDING, and
        // reserve pass/seat stock immediately so nobody else can grab
        // the same seats while this booking waits for UTR + approval.
        // PaymentModal.jsx needs booking._id and booking.amount to
        // render, so the row has to exist before payment starts.
        const session = await mongoose.startSession();
        let newBooking;

        try {
            await session.withTransaction(async () => {

                for (const line of builtLines) {
                    const updatedPass = await Pass.findOneAndUpdate(
                        { _id: line.PassId, AvlblPass: { $gte: line.qty } },
                        { $inc: { AvlblPass: -line.qty } },
                        { new: true, session }
                    );

                    if (!updatedPass) {
                        throw new Error('Pass stock changed. Please try again.');
                    }
                }

                const updatedEvent = await Event.findOneAndUpdate(
                    { _id: eventId, availableSeats: { $gte: totalQty } },
                    { $inc: { availableSeats: -totalQty } },
                    { new: true, session }
                );

                if (!updatedEvent) {
                    throw new Error('Event seats are no longer available.');
                }

                newBooking = await booking.create(
                    [{
                        user: req.user._id,
                        eventId: event._id,
                        PassLines: builtLines,
                        amount: baseAmount - discount,
                        discount,
                        PromoCod: appliedCode,
                        tickets: totalQty,

                        status: BOOKING_STATUS.PAYMENT_PENDING,
                        paymentStatus: PAYMENT_STATUS.PENDING,

                        paymentGateway: gatewayType,
                        gatewayType: gatewayType
                    }],
                    { session }
                );

                newBooking = newBooking[0];
            });
        } finally {
            await session.endSession();
        }

        // OTP only needed up to booking creation
        await OTP.deleteMany({
            email: req.user.email,
            action: 'event_booking'
        });

        return res.status(200).json({
            success: true,
            message: 'Booking created. Proceed to payment.',
            paymentRequired: true,
            booking: newBooking
        });

    } catch (error) {
        console.error('bookEvent ERROR:', error);

        res.status(500).json({
            message: 'Error booking event',
            error: error.message
        });
    }
};


/**
 * UPDATE BOOKING STATUS
 */
exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const validStatuses = [
            BOOKING_STATUS.PAYMENT_PENDING,
            BOOKING_STATUS.CONFIRMED,
            BOOKING_STATUS.CANCELLED,
        ];

        if (!validStatuses.includes(Number(status))) {
            return res.status(400).json({
                message: 'Invalid status'
            });
        }

        const newStatus = Number(status);

        const bookingDoc = await booking
            .findById(req.params.id)
            .populate('eventId')
            .populate('user');

        if (!bookingDoc) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        if (bookingDoc.status === newStatus) {
            return res.status(200).json({
                message: 'Status unchanged',
                booking: bookingDoc
            });
        }

        const event = await Event.findById(
            bookingDoc.eventId._id
        );

        if (!event) {
            return res.status(404).json({
                message: 'Event not found'
            });
        }

        const wasConfirmed =
            bookingDoc.status === BOOKING_STATUS.CONFIRMED;

        const willBeConfirmed =
            newStatus === BOOKING_STATUS.CONFIRMED;

        if (wasConfirmed && !willBeConfirmed) {
            event.availableSeats += bookingDoc.tickets;
            await event.save();
        }

        bookingDoc.status = newStatus;

        await bookingDoc.save();

        if (willBeConfirmed) {
            try {
                await sendbookingEmail(
                    bookingDoc.user.email,
                    bookingDoc.user.name,
                    bookingDoc.eventId.title
                );
            } catch (emailError) {
                console.error(
                    'Booking confirmed but email failed:',
                    emailError
                );
            }
        }

        res.status(200).json({
            message: 'Booking status updated',
            booking: bookingDoc
        });

    } catch (error) {
        console.error(
            'updateBookingStatus ERROR:',
            error
        );

        res.status(500).json({
            message: 'Error updating booking status',
            error: error.message
        });
    }
};


/**
 * GET MY BOOKINGS
 */
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await booking
            .find({ user: req.user._id })
            .populate('eventId');

        res.status(200).json(bookings);

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching bookings',
            error: error.message,
            stack: error.stack
        });
    }
};


/**
 * GET ALL BOOKINGS
 * Attaches pendingPayment ({ paymentId, utr }) to any booking that
 * has a UTR waiting for approval, so the admin UI can show an
 * Approve action and hit paymentController.verifyUTR with the right
 * paymentId — not flip status directly.
 */
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await booking
            .find()
            .populate('eventId')
            .populate('user')
            .lean();

        const pendingPayments = await Payment.find({
            status: PAYMENT_STATUS.UTR_SUBMITTED
        }).select('bookingId utr');

        const paymentByBooking = {};

        pendingPayments.forEach((p) => {
            paymentByBooking[p.bookingId.toString()] = {
                paymentId: p._id,
                utr: p.utr
            };
        });

        const enriched = bookings.map((b) => ({
            ...b,
            pendingPayment: paymentByBooking[b._id.toString()] || null
        }));

        res.status(200).json(enriched);

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching bookings',
            error: error.message
        });
    }
};


/**
 * CANCEL BOOKING
 *
 * If the booking being cancelled was already CONFIRMED (i.e. someone
 * approved it — possibly by mistake — and it's now being reverted),
 * we:
 *   1. mark the ticket inactive (TktActive = false) so QR/ticket-code
 *      lookups can be blocked even if someone kept the old QR,
 *   2. email the buyer that their ticket is no longer valid and they
 *      need to book again.
 * A plain cancel of a PAYMENT_PENDING booking (never confirmed) does
 * NOT send this "reverted by mistake" email — only true reversals do.
 */
exports.cancelBooking = async (req, res) => {
    try {
        const bookingDoc = await booking
            .findById(req.params.id)
            .populate('eventId')
            .populate('user');

        if (!bookingDoc) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        const isOwner =
            bookingDoc.user._id.toString() ===
            req.user._id.toString();

        const isAdmin =
            req.user.role === 'admin' || req.user.UsrTyp === 500;

        const hasRight =
            req.user.Rights?.CanCncl === true;

        if (!isAdmin && !(isOwner && hasRight)) {
            return res.status(403).json({
                message: 'You are not authorized to cancel this booking'
            });
        }

        if (bookingDoc.status === BOOKING_STATUS.CANCELLED) {
            return res.status(400).json({
                message: 'Booking is already cancelled'
            });
        }

        if (bookingDoc.status === BOOKING_STATUS.REJECTED) {
            return res.status(400).json({
                message: 'Booking is already rejected'
            });
        }

        const wasConfirmedByMistake =
            bookingDoc.status === BOOKING_STATUS.CONFIRMED;

        const hadReservedSeats =
            bookingDoc.status === BOOKING_STATUS.PAYMENT_PENDING ||
            bookingDoc.status === BOOKING_STATUS.CONFIRMED;

        if (hadReservedSeats) {
            const event = await Event.findById(bookingDoc.eventId._id);

            if (event) {
                event.availableSeats += bookingDoc.tickets;
                await event.save();
            }
        }

        // Restore pass stock
        if (Array.isArray(bookingDoc.PassLines)) {
            for (const line of bookingDoc.PassLines) {
                await Pass.findByIdAndUpdate(
                    line.PassId,
                    { $inc: { AvlblPass: line.qty } }
                );
            }
        }

        // bookingDoc.status = BOOKING_STATUS.CANCELLED;

        if (wasConfirmedByMistake) {
            // Invalidate the ticket so it can't be scanned/used, even
            // if the buyer still has the old QR/PDF.
            bookingDoc.TktActive = false;
            bookingDoc.TktStat = 400; // "cancelled / no longer valid"
            bookingDoc.paymentStatus = 400; // optional: remove the code entirely
            bookingDoc.status = 400; // optional: remove the code entirely
        }

        await bookingDoc.save();

        if (wasConfirmedByMistake) {
            try {
                await sendBookingRevertedEmail({
                    toEmail: bookingDoc.user.email,
                    name: bookingDoc.user.name,
                    eventTitle: bookingDoc.eventId?.title,
                    tktCod: bookingDoc.TktCod,
                    message:
                        "This booking was confirmed by mistake. Your ticket is no longer valid — please book again."
                });
            } catch (mailErr) {
                console.error('Reverted-booking email failed:', mailErr);
            }
        }

        res.status(200).json({
            message: wasConfirmedByMistake
                ? 'Booking reverted — buyer notified that the ticket is no longer valid'
                : 'Booking cancelled successfully',
            booking: bookingDoc
        });

    } catch (error) {
        console.error('cancelBooking ERROR:', error);

        res.status(500).json({
            message: 'Error cancelling booking',
            error: error.message
        });
    }
};


/**
 * ADMIN BOOK EVENT
 * (unchanged from your version — still creates a CONFIRMED booking
 * directly, since this is the staff/UTR-manual-entry flow)
 */
exports.adminBookEvent = async (req, res) => {
    try {
        const {
            eventId,
            passLines,
            promoCode,
            gstEmail,
            gstPh
        } = req.body;

        if (!gstEmail && !gstPh) {
            return res.status(400).json({
                message: 'Enter the email or phone number to book for'
            });
        }

        if (!Array.isArray(passLines) || passLines.length === 0) {
            return res.status(400).json({
                message: 'Select at least one pass type'
            });
        }

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: 'Event not found'
            });
        }

        const totalQty = passLines.reduce(
            (sum, line) => sum + Number(line.qty || 0),
            0
        );

        if (totalQty <= 0) {
            return res.status(400).json({
                message: 'Select at least one ticket'
            });
        }

        if (event.availableSeats < totalQty) {
            return res.status(400).json({
                message: 'No available seats for this event'
            });
        }

        const builtLines = [];
        let baseAmount = 0;

        for (const line of passLines) {
            const pass = await Pass.findById(line.passId);

            if (!pass || !pass.isActive) {
                return res.status(404).json({
                    message: 'One of the selected passes is not available'
                });
            }

            const qty = Number(line.qty);

            if (qty <= 0) {
                return res.status(400).json({
                    message: `Invalid quantity for ${pass.name}`
                });
            }

            if (qty > pass.MaxPerBook) {
                return res.status(400).json({
                    message: `Max ${pass.MaxPerBook} of ${pass.name} per booking`
                });
            }

            if (pass.AvlblPass < qty) {
                return res.status(400).json({
                    message: `Not enough passes left for ${pass.name}`
                });
            }

            builtLines.push({
                PassId: pass._id,
                qty,
                rate: pass.price
            });

            baseAmount += pass.price * qty;
        }

        const decremented = [];
        let stockError = null;

        for (const line of builtLines) {
            const updated = await Pass.findOneAndUpdate(
                { _id: line.PassId, AvlblPass: { $gte: line.qty } },
                { $inc: { AvlblPass: -line.qty } },
                { new: true }
            );

            if (!updated) {
                stockError = 'Not enough passes left for one of the selections';
                break;
            }

            decremented.push(line);
        }

        if (stockError) {
            for (const line of decremented) {
                await Pass.findByIdAndUpdate(
                    line.PassId,
                    { $inc: { AvlblPass: line.qty } }
                );
            }

            return res.status(400).json({ message: stockError });
        }

        let discount = 0;
        let appliedCode = null;

        if (promoCode) {
            const promo = await Promo.findOne({
                Cod: promoCode.trim().toUpperCase()
            });

            if (
                promo &&
                promo.IsActv &&
                new Date(promo.ExpDt) >= new Date() &&
                baseAmount >= promo.MinAmt
            ) {
                discount =
                    promo.Typ === 'percent'
                        ? Math.round((baseAmount * promo.Val) / 100)
                        : Math.min(promo.Val, baseAmount);

                appliedCode = promo.Cod;
            }
        }

        const newBooking = await booking.create({
            user: req.user._id,
            eventId: event._id,
            PassLines: builtLines,
            status: BOOKING_STATUS.CONFIRMED,
            paymentStatus: PAYMENT_STATUS.PENDING,
            amount: baseAmount - discount,
            discount,
            paymentGateway: 10, // UTR based
            gatewayType: 10,    // UTR based
            PromoCod: appliedCode,
            tickets: totalQty,
            nBookedBy: 500,
            GstEmail: gstEmail || null,
            GstPh: gstPh || null,
        });

        event.availableSeats -= totalQty;
        await event.save();

        newBooking.TktCod =
            `TKT-${newBooking._id.toString().slice(-8).toUpperCase()}-${crypto
                .randomBytes(3)
                .toString('hex')
                .toUpperCase()}`;

        newBooking.TktActive = true;

        await newBooking.save();

        await Payment.create({
            bookingId: newBooking._id,
            amount: newBooking.amount,
            status: PAYMENT_STATUS.PENDING
        });

        const passDetailsList = [];

        for (const line of builtLines) {
            const passDoc = await Pass.findById(line.PassId);

            passDetailsList.push({
                name: passDoc?.name || 'Pass',
                qty: line.qty,
                rate: line.rate
            });
        }

        const buyerInfo = {
            name: gstEmail || gstPh || 'Guest',
            email: gstEmail || null,
            phone: gstPh || null,
        };

        if (gstEmail) {
            try {
                const qrBuffer = await generateQR(newBooking.TktCod);

                const invoiceBuffer = await generateInvoicePDF(
                    newBooking, event, passDetailsList, buyerInfo
                );

                const identifier = gstPh || gstEmail.split('@')[0];

                const { filename } = saveInvoiceToDisk(invoiceBuffer, identifier);

                await sendTicketEmail({
                    toEmail: gstEmail,
                    name: buyerInfo.name,
                    eventTitle: event.title,
                    qrBuffer,
                    invoiceBuffer,
                    tktCod: newBooking.TktCod,
                    invoiceFilename: filename,
                });

            } catch (mailErr) {
                console.error('Ticket email/PDF failed (admin booking):', mailErr);
            }
        }

        res.status(201).json({
            message: 'Booking created',
            booking: newBooking
        });

    } catch (error) {
        console.error('adminBookEvent ERROR:', error);

        res.status(500).json({
            message: 'Error creating booking',
            error: error.message
        });
    }
};


/**
 * GET TICKET BY CODE
 */
exports.getTicketByCode = async (req, res) => {
    try {
        const { tktCod } = req.params;
        const cleanCode = tktCod.trim().toUpperCase();

        const bookingDoc = await booking
            .findOne({ TktCod: cleanCode })
            .populate('eventId')
            .populate('user')
            .populate('PassLines.PassId');

        if (!bookingDoc) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        if (bookingDoc.TktActive === false) {
            return res.status(410).json({
                message: 'This ticket is no longer valid. Please book again.'
            });
        }

        res.status(200).json({
            TktCod: bookingDoc.TktCod,
            TktStat: bookingDoc.TktStat,
            status: bookingDoc.status,
            eventTitle: bookingDoc.eventId?.title,
            eventDate: bookingDoc.eventId?.date,
            bookedFor:
                bookingDoc.GstEmail ||
                bookingDoc.GstPh ||
                bookingDoc.user?.name,
            amount: bookingDoc.amount,
            passLines: bookingDoc.PassLines.map(line => ({
                name: line.PassId?.name || 'Pass',
                qty: line.qty,
                rate: line.rate,
            })),
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching ticket',
            error: error.message
        });
    }
};


/**
 * VERIFY TICKET (gate scan)
 */
exports.verifyTicket = async (req, res) => {
    try {
        const { tktCod } = req.params;
        const cleanCode = tktCod.trim().toUpperCase();

        const bookingDoc = await booking.findOne({ TktCod: cleanCode });

        if (!bookingDoc) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        if (bookingDoc.TktActive === false) {
            return res.status(410).json({
                message: 'This ticket was cancelled after being confirmed by mistake and is no longer valid'
            });
        }

        if (bookingDoc.TktStat === 409) {
            return res.status(409).json({
                message: 'This ticket has already been verified'
            });
        }

        if (bookingDoc.status !== BOOKING_STATUS.CONFIRMED) {
            return res.status(400).json({
                message: 'This ticket is not in confirmed status'
            });
        }

        bookingDoc.TktStat = 409;
        await bookingDoc.save();

        res.status(200).json({ message: 'Ticket verified successfully' });

    } catch (error) {
        res.status(500).json({
            message: 'Error verifying ticket',
            error: error.message
        });
    }
};


/**
 * GET SCAN STATS
 */
exports.getScanStats = async (req, res) => {
    try {
        const totalConfirmed = await booking.countDocuments({
            status: BOOKING_STATUS.CONFIRMED
        });

        const scanned = await booking.countDocuments({
            status: BOOKING_STATUS.CONFIRMED,
            TktStat: 409
        });

        const notScanned = totalConfirmed - scanned;

        res.status(200).json({
            total: totalConfirmed,
            scanned,
            notScanned,
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching scan stats',
            error: error.message
        });
    }
};


/**
 * GET MY TICKET QR
 */
exports.getMyTicketQR = async (req, res) => {
    try {
        const bookingDoc = await booking
            .findById(req.params.id)
            .populate('eventId')
            .populate('PassLines.PassId');

        if (!bookingDoc) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (
            bookingDoc.user.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (!bookingDoc.TktCod) {
            return res.status(400).json({
                message: 'Ticket code not generated for this booking'
            });
        }

        if (bookingDoc.TktActive === false) {
            return res.status(410).json({
                message: 'This ticket is no longer valid. Please book again.'
            });
        }

        const qrBuffer = await generateQR(bookingDoc.TktCod);
        const qrBase64 = qrBuffer.toString('base64');

        res.status(200).json({
            TktCod: bookingDoc.TktCod,
            qrImage: `data:image/png;base64,${qrBase64}`,
            status: bookingDoc.status,
            TktStat: bookingDoc.TktStat,
            eventTitle: bookingDoc.eventId?.title,
            eventDate: bookingDoc.eventId?.date,
            eventLocation: bookingDoc.eventId?.location,
            amount: bookingDoc.amount,
            discount: bookingDoc.discount,
            passLines: bookingDoc.PassLines.map(line => ({
                name: line.PassId?.name || 'Pass',
                qty: line.qty,
                rate: line.rate,
            })),
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error generating QR',
            error: error.message
        });
    }
};
