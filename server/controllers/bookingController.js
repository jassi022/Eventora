const booking = require('../models/Bookings');
const OTP = require('../models/OTP');
const Event = require('../models/Event');
const { sendOTPEmail, sendbookingEmail } = require('../utils/email');
const e = require('express');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
}

exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP(); // Generate a 6-digit OTP
        const { email, eventId } = req.body;
        await OTP.findOneAndDelete({ email: req.user.email, action: 'event_booking' });
        await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        await sendOTPEmail(req.user.email, otp, 'event_booking');
        res.status(200).json({ message: 'OTP sent to your email for booking confirmation' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error sending OTP', error });
    }
};

exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP(); // Generate a 6-digit OTP
        const { email, eventId } = req.body;
        await OTP.findOneAndDelete({ email: email, action: 'event_booking' });
        await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        await sendOTPEmail(req.user.email, otp, 'event_booking');
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

        const existingBooking = await booking.findOne({ user: req.user._id, event: eventId });
        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked this event' });
        }

        const booking = await booking.create(
            {
                user: req.user._id,
                eventId,
                status: 'pending',
                paymentStatus: 'unPaid',
                amount: event.ticketPrice,

            });

        await OTP.deleteMany({ email: req.user.email, action: 'event_booking' });
        res.status(201).json({ message: 'Event booked successfully', booking });
    }
    catch (error) {
        res.status(500).json({ message: 'Error booking event', error });
    }
};

exports.confirmBooking = async (req, res) => {
    try {
        const paymentStatus = req.body.paymentStatus;
        if (![].includes(paymentStatus, ['paid', 'unPaid'])) {
            return res.status(400).json({ message: 'Invalid payment status' });
        }
        const booking = await Booking.findById(req.params.id).populate('eventId').populate('user');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (booking.status == 'confirmed') {
            return res.status(400).json({ message: 'Booking is already confirmed' });
        }
        const event = await Event.findById(booking.eventId._id);
        if (event.totalSeats <= 0) {
            return res.status(400).json({ message: 'No available seats for this event' });
        }

        booking.status = 'confirmed';
        if (paymentStatus) {
            booking.paymentStatus = paymentStatus;
        }
        await booking.save();
        event.totalSeats -= 1;
        await event.save();
        await sendBookingEmail(booking.user.email, booking.user.name, booking.eventId.title);
        res.status(200).json({ message: 'Booking confirmed successfully', booking });
    }
    catch (error) {
        res.status(500).json({ message: 'Error confirming booking', error });
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

// exports.getAllBookings = async (req, res) => {
//     try {
//         const bookings = await booking.find().populate('eventId').populate('user'); 
//         res.status(200).json(bookings);
//     }
//     catch (error) {
//         res.status(500).json({ message: 'Error fetching bookings', error });
//     }
// };

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await booking.findById(req.params.id).populate('eventId');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to cancel this booking' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }
        booking.status = 'cancelled';
        await booking.save();
        const event = await Event.findById(booking.eventId._id);
        event.totalSeats += 1;
        await event.save();
        res.status(200).json({ message: 'Booking cancelled successfully', booking });
    }
    catch (error) {
        res.status(500).json({ message: 'Error cancelling booking', error });
    }
};

