const booking = require('../models/Bookings');
const OTP = require('../models/OTP');
const Event = require('../models/Event');
const { sendOtpEmail, sendbookingEmail } = require('../utils/email');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
}

exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP(); // Generate a 6-digit OTP
        const { eventId } = req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const existingBooking = await booking.findOne({ user: req.user._id, eventId, status: { $in: ['pending', 'confirmed'] } });
        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked this event' });
        }

        await OTP.findOneAndDelete({ email: req.user.email, action: 'event_booking' });
        await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        await sendOtpEmail(req.user.email, otp, 'event_booking');
        res.status(200).json({ message: 'OTP sent to your email for booking confirmation' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error sending OTP', error });
    }
};

exports.bookEvent = async (req, res) => {
    try {
        const { eventId, otp } = req.body;
        const otpRecord = await OTP.findOne({ email: req.user.email, otp, action: 'event_booking' });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.totalSeats <= 0) {
            return res.status(400).json({ message: 'No available seats for this event' });
        }

        const newBooking = await booking.create({
            user: req.user._id,
            eventId: event._id,
            status: 'confirmed',
            paymentStatus: 'unPaid',
            amount: event.ticketPrice,
            tickets: 1
        });

        await OTP.deleteMany({ email: req.user.email, action: 'event_booking' });
        res.status(201).json({ message: 'Event booked successfully', booking: newBooking });
    }
    catch (error) {
        res.status(500).json({ message: 'Error booking event', error });
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

        // Moving INTO confirmed: take a seat (only if one's free)
        if (!wasConfirmed && willBeConfirmed) {
            if (event.totalSeats < bookingDoc.tickets) {
                return res.status(400).json({ message: 'No available seats for this event' });
            }
            event.totalSeats -= bookingDoc.tickets;
            await event.save();
        }
        // Moving OUT of confirmed: release the seat back
        else if (wasConfirmed && !willBeConfirmed) {
            event.totalSeats += bookingDoc.tickets;
            await event.save();
        }

        bookingDoc.status = status;
        await bookingDoc.save();

        if (willBeConfirmed) {
            await sendbookingEmail(bookingDoc.user.email, bookingDoc.user.name, bookingDoc.eventId.title);
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
        if (bookingDoc.user.toString() !== req.user._id.toString()) {
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
            event.totalSeats += 1;
            await event.save();
        }
        res.status(200).json({ message: 'Booking cancelled successfully', booking: bookingDoc });
    }
    catch (error) {
        res.status(500).json({ message: 'Error cancelling booking', error });
    }
};