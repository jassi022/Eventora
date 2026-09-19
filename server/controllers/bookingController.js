const booking = require('../models/Bookings');
const OTP = require('../models/OTP');
const Event = require('../models/Event');
const Pass = require('../models/Pass');
const Promo = require('../models/Promo');
const { sendOtpEmail, sendbookingEmail } = require('../utils/email');
const crypto = require('crypto');
const { generateQR, generateInvoicePDF, saveInvoiceToDisk } = require('../utils/ticket');
const { sendTicketEmail } = require('../utils/email');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
}

exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP();
        const { eventId, passLines } = req.body; // passLines = [{ passId, qty }, ...]

        if (!Array.isArray(passLines) || passLines.length === 0) {
            return res.status(400).json({ message: 'Select at least one pass type' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const totalQty = passLines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
        if (totalQty <= 0) {
            return res.status(400).json({ message: 'Select at least one ticket' });
        }
        if (event.availableSeats < totalQty) {
            return res.status(400).json({ message: 'No available seats for this event' });
        }

        // ⬇️ yahan lagana hai — har pass line ka existence, active status, per-booking max, aur stock check
        for (const line of passLines) {
            const pass = await Pass.findById(line.passId);
            if (!pass || !pass.isActive) {
                return res.status(404).json({ message: 'One of the selected passes is not available' });
            }
            if (Number(line.qty) > pass.MaxPerBook) {
                return res.status(400).json({ message: `You can book at most ${pass.MaxPerBook} of ${pass.name} per booking` });
            }
            if (pass.AvlblPass < Number(line.qty)) {
                return res.status(400).json({ message: `Not enough passes left for ${pass.name}` });
            }
        }
        // ⬆️ yahan tak

        const existingBooking = await booking.findOne({ user: req.user._id, eventId, status: { $in: ['pending', 'confirmed'] } });
        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked this event' });
        }

        await OTP.findOneAndDelete({ email: req.user.email, action: 'event_booking' });
        await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        await sendOtpEmail(req.user.email, otp, 'event_booking');
        res.status(200).json({ message: 'OTP sent to your email for booking confirmation' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending OTP', error: error.message });
    }
};

exports.bookEvent = async (req, res) => {
    try {
        const { eventId, otp, passLines, promoCode } = req.body;

        if (!Array.isArray(passLines) || passLines.length === 0) {
            return res.status(400).json({ message: 'Select at least one pass type' });
        }

        const otpRecord = await OTP.findOne({ email: req.user.email, otp, action: 'event_booking' });
        if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired OTP' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const totalQty = passLines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
        if (event.availableSeats < totalQty) {
            return res.status(400).json({ message: 'No available seats for this event' });
        }

        // fetch + validate every pass, build the line items with locked-in rate
        const builtLines = [];
        let baseAmount = 0;
        for (const line of passLines) {
            const pass = await Pass.findById(line.passId);
            if (!pass || !pass.isActive) {
                return res.status(404).json({ message: 'One of the selected passes is not available' });
            }
            const qty = Number(line.qty);
            // ⬇️ yahi loop ke andar, har pass ke fetch hote hi check laga diya
            if (qty > pass.MaxPerBook) {
                return res.status(400).json({ message: `You can book at most ${pass.MaxPerBook} of ${pass.name} per booking` });
            }
            if (pass.AvlblPass < qty) {
                return res.status(400).json({ message: `Not enough passes left for ${pass.name}` });
            }
            // ⬆️
            builtLines.push({ PassId: pass._id, qty, rate: pass.price });
            baseAmount += pass.price * qty;
        }

        // atomic stock decrement for every pass line — rolls back already-decremented lines if any later one fails
        const decremented = [];
        let stockError = null;
        for (const line of builtLines) {
            const updated = await Pass.findOneAndUpdate(
                { _id: line.PassId, AvlblPass: { $gte: line.qty } },
                { $inc: { AvlblPass: -line.qty } },
                { new: true }
            );
            if (!updated) {
                stockError = `Not enough passes left for one of your selections`;
                break;
            }
            decremented.push(line);
        }
        if (stockError) {
            for (const line of decremented) {
                await Pass.findByIdAndUpdate(line.PassId, { $inc: { AvlblPass: line.qty } });
            }
            return res.status(400).json({ message: stockError });
        }

        let discount = 0;
        let appliedCode = null;
        if (promoCode) {
            const promo = await Promo.findOne({ Cod: promoCode.trim().toUpperCase() });
            if (promo && promo.IsActv && new Date(promo.ExpDt) >= new Date() && baseAmount >= promo.MinAmt) {
                discount = promo.Typ === 'percent'
                    ? Math.round((baseAmount * promo.Val) / 100)
                    : Math.min(promo.Val, baseAmount);
                appliedCode = promo.Cod;
            }
        }

        const newBooking = await booking.create({
            PassId: builtLines.map(l => l.PassId),
            user: req.user._id,
            eventId: event._id,
            PassLines: builtLines,
            status: 'confirmed',
            paymentStatus: 'unPaid',
            amount: baseAmount - discount,
            discount,
            PromoCod: appliedCode,
            tickets: totalQty,
        });

        newBooking.TktCod = `TKT-${newBooking._id.toString().slice(-8).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        await newBooking.save();

        const passDetailsList = [];
        for (const line of builtLines) {
            const passDoc = await Pass.findById(line.PassId);
            passDetailsList.push({ name: passDoc?.name || 'Pass', qty: line.qty, rate: line.rate });
        }

        const buyerInfo = {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone || null, // agar User model mein phone field ho
        };

        try {
            const qrBuffer = await generateQR(newBooking.TktCod);
            const invoiceBuffer = await generateInvoicePDF(newBooking, event, passDetailsList, buyerInfo);

            // identifier: phone agar hai, warna email ka username part
            const identifier = buyerInfo.phone || buyerInfo.email.split('@')[0];
            const { filename } = saveInvoiceToDisk(invoiceBuffer, identifier);

            await sendTicketEmail({
                toEmail: req.user.email,
                name: req.user.name,
                eventTitle: event.title,
                qrBuffer,
                invoiceBuffer,
                tktCod: newBooking.TktCod,
                invoiceFilename: filename,
            });
        } catch (mailErr) {
            console.error('Ticket email/PDF failed:', mailErr);
        }

        event.availableSeats -= totalQty;
        await event.save();

        await OTP.deleteMany({ email: req.user.email, action: 'event_booking' });
        res.status(201).json({ message: 'Event booked successfully', booking: newBooking });
    } catch (error) {
        ``
        res.status(500).json({ message: 'Error booking event', error: error.message });
    }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'confirmed', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const bookingDoc = await booking.findById(req.params.id).populate('eventId').populate('user');
        if (!bookingDoc) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (bookingDoc.status === status) {
            return res.status(200).json({ message: 'Status unchanged', booking: bookingDoc });
        }

        const event = await Event.findById(bookingDoc.eventId._id);
        const wasConfirmed = bookingDoc.status === 'confirmed';
        const willBeConfirmed = status === 'confirmed';
        if (!wasConfirmed && willBeConfirmed) {
            if (event.availableSeats < bookingDoc.tickets) {
                return res.status(400).json({ message: 'No available seats for this event' });
            }
            event.availableSeats -= bookingDoc.tickets;
            await event.save();
        }
        else if (wasConfirmed && !willBeConfirmed) {
            event.availableSeats += bookingDoc.tickets;
            await event.save();
        }

        bookingDoc.status = status;
        await bookingDoc.save();

        if (willBeConfirmed) {
            try {
                await sendbookingEmail(bookingDoc.user.email, bookingDoc.user.name, bookingDoc.eventId.title);
            } catch (emailError) {
                console.error('Booking confirmed but email failed to send:', emailError);
                // don't fail the request just because the email didn't go out
            }
        }

        res.status(200).json({ message: 'Booking status updated', booking: bookingDoc });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating booking status', error: error.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await booking.find({ user: req.user._id }).populate('eventId');
        res.status(200).json(bookings);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await booking.find().populate('eventId').populate('user');
        res.status(200).json(bookings);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const bookingDoc = await booking.findById(req.params.id).populate('eventId');
        if (!bookingDoc) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const isOwner = bookingDoc.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const hasRight = req.user.Rights?.CanCncl === true;

        if (!isAdmin && !(isOwner && hasRight)) {
            return res.status(403).json({ message: 'You are not authorized to cancel this booking' });
        }
        if (bookingDoc.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }
        const wasConfirmed = bookingDoc.status === 'confirmed';
        bookingDoc.status = 'cancelled';
        await bookingDoc.save();

        if (wasConfirmed) {
            const event = await Event.findById(bookingDoc.eventId._id);
            event.availableSeats += 1;
            await event.save();
        }
        res.status(200).json({ message: 'Booking cancelled successfully', booking: bookingDoc });
    }
    catch (error) {
        res.status(500).json({ message: 'Error cancelling booking', error });
    }
};

exports.adminBookEvent = async (req, res) => {
    try {
        const { eventId, passLines, promoCode, gstEmail, gstPh } = req.body;

        if (!gstEmail && !gstPh) {
            return res.status(400).json({ message: 'Enter the email or phone number to book for' });
        }
        if (!Array.isArray(passLines) || passLines.length === 0) {
            return res.status(400).json({ message: 'Select at least one pass type' });
        }
        if (!gstEmail && !gstPh) {
            return res.status(400).json({ message: 'Enter the email or phone number to book for' });
        }
        if (!Array.isArray(passLines) || passLines.length === 0) {
            return res.status(400).json({ message: 'Select at least one pass type' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const totalQty = passLines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
        if (event.availableSeats < totalQty) {
            return res.status(400).json({ message: 'No available seats for this event' });
        }

        const builtLines = [];
        let baseAmount = 0;
        for (const line of passLines) {
            const pass = await Pass.findById(line.passId);
            if (!pass || !pass.isActive) {
                return res.status(404).json({ message: 'One of the selected passes is not available' });
            }
            const qty = Number(line.qty);
            if (qty > pass.MaxPerBook) {
                return res.status(400).json({ message: `Max ${pass.MaxPerBook} of ${pass.name} per booking` });
            }
            if (pass.AvlblPass < qty) {
                return res.status(400).json({ message: `Not enough passes left for ${pass.name}` });
            }
            builtLines.push({ PassId: pass._id, qty, rate: pass.price });
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
            if (!updated) { stockError = 'Not enough passes left for one of the selections'; break; }
            decremented.push(line);
        }
        if (stockError) {
            for (const line of decremented) {
                await Pass.findByIdAndUpdate(line.PassId, { $inc: { AvlblPass: line.qty } });
            }
            return res.status(400).json({ message: stockError });
        }

        let discount = 0;
        let appliedCode = null;
        if (promoCode) {
            const promo = await Promo.findOne({ Cod: promoCode.trim().toUpperCase() });
            if (promo && promo.IsActv && new Date(promo.ExpDt) >= new Date() && baseAmount >= promo.MinAmt) {
                discount = promo.Typ === 'percent'
                    ? Math.round((baseAmount * promo.Val) / 100)
                    : Math.min(promo.Val, baseAmount);
                appliedCode = promo.Cod;
            }
        }

        const newBooking = await booking.create({
            user: req.user._id, // admin jisne yeh booking banayi
            eventId: event._id,
            PassLines: builtLines,
            status: 'confirmed',
            paymentStatus: 'unPaid',
            amount: baseAmount - discount,
            discount,
            PromoCod: appliedCode,
            tickets: totalQty,
            nBookedBy: 500,
            GstEmail: gstEmail || null,
            GstPh: gstPh || null,
        });

        event.availableSeats -= totalQty;
        await event.save();
        newBooking.TktCod = `TKT-${newBooking._id.toString().slice(-8).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        await newBooking.save();

        const passDetailsList = [];
        for (const line of builtLines) {
            const passDoc = await Pass.findById(line.PassId);
            passDetailsList.push({ name: passDoc?.name || 'Pass', qty: line.qty, rate: line.rate });
        }

        const buyerInfo = {
            name: gstEmail || gstPh || 'Guest',
            email: gstEmail || null,
            phone: gstPh || null,
        };

        if (gstEmail) {
            try {
                const qrBuffer = await generateQR(newBooking.TktCod);
                const invoiceBuffer = await generateInvoicePDF(newBooking, event, passDetailsList, buyerInfo);

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
        res.status(201).json({ message: 'Booking created', booking: newBooking });
    } catch (error) {
        res.status(500).json({ message: 'Error creating booking', error: error.message });
    }
};

exports.getTicketByCode = async (req, res) => {
    try {
        const { tktCod } = req.params;
        const cleanCode = tktCod.trim().toUpperCase();
        const bookingDoc = await booking.findOne({ TktCod: cleanCode })
            .populate('eventId')
            .populate('user')
            .populate('PassLines.PassId');
        if (!bookingDoc) return res.status(404).json({ message: 'Ticket not found' });

        res.status(200).json({
            TktCod: bookingDoc.TktCod,
            TktStat: bookingDoc.TktStat,
            status: bookingDoc.status,
            eventTitle: bookingDoc.eventId?.title,
            eventDate: bookingDoc.eventId?.date,
            bookedFor: bookingDoc.GstEmail || bookingDoc.GstPh || bookingDoc.user?.name,
            amount: bookingDoc.amount,
            passLines: bookingDoc.PassLines.map((l) => ({
                name: l.PassId?.name || 'Pass',
                qty: l.qty,
                rate: l.rate,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching ticket', error: error.message });
    }
};

exports.verifyTicket = async (req, res) => {
    try {
        const { tktCod } = req.params;
        const cleanCode = tktCod.trim().toUpperCase();
        const bookingDoc = await booking.findOne({ TktCod: cleanCode });
        if (!bookingDoc) return res.status(404).json({ message: 'Ticket not found' });

        if (bookingDoc.TktStat === 409) {
            return res.status(409).json({ message: 'This ticket has already been verified' });
        }
        if (bookingDoc.status !== 'confirmed') {
            return res.status(400).json({ message: 'This ticket is not in confirmed status' });
        }

        bookingDoc.TktStat = 409;
        await bookingDoc.save();
        res.status(200).json({ message: 'Ticket verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying ticket', error: error.message });
    }
};

exports.getScanStats = async (req, res) => {
    try {
        const totalConfirmed = await booking.countDocuments({ status: 'confirmed' });
        const scanned = await booking.countDocuments({ status: 'confirmed', TktStat: 409 });
        const notScanned = totalConfirmed - scanned;

        res.status(200).json({
            total: totalConfirmed,
            scanned,
            notScanned,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching scan stats', error: error.message });
    }
};

exports.getMyTicketQR = async (req, res) => {
    try {
        const bookingDoc = await booking.findById(req.params.id)
            .populate('eventId')
            .populate('PassLines.PassId');
        if (!bookingDoc) return res.status(404).json({ message: 'Booking not found' });

        if (bookingDoc.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (!bookingDoc.TktCod) {
            return res.status(400).json({ message: 'Ticket code not generated for this booking' });
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
            passLines: bookingDoc.PassLines.map((l) => ({
                name: l.PassId?.name || 'Pass',
                qty: l.qty,
                rate: l.rate,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating QR', error: error.message });
    }
};