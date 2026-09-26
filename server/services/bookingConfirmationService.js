const Booking = require('../models/Booking');
const Event = require('../models/Event');

const {
    generateQR,
    generateInvoicePDF,
    saveInvoiceToDisk
} = require('../utils/ticket');

const {
    sendTicketEmail
} = require('../utils/email');

const confirmBookingAfterPayment = async (bookingId) => {

    const booking = await Booking.findById(bookingId)
        .populate('user')
        .populate('eventId')
        .populate('PassLines.PassId');

    if (!booking) {
        throw new Error('Booking not found');
    }

    const event = booking.eventId;

    if (!booking.TktCod) {
        booking.TktCod =
            `EVT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        booking.TktStat = 410;

        await booking.save();
    }

    // QR
    const qrBuffer = await generateQR(booking.TktCod);

    // Pass details
    const passDetailsList = booking.PassLines.map((line) => ({
        name: line.PassId?.name || line.PassId?.PassName || 'Pass',
        qty: line.qty,
        rate: line.rate
    }));

    const buyerInfo = {
        name:
            booking.GstName ||
            booking.user?.name ||
            booking.user?.username ||
            'Customer',

        email:
            booking.GstEmail ||
            booking.user?.email,

        phone:
            booking.GstPh ||
            booking.user?.phone
    };

    // PDF
    const invoiceBuffer = await generateInvoicePDF(
        booking,
        event,
        passDetailsList,
        buyerInfo
    );

    // Save PDF
    const savedInvoice = saveInvoiceToDisk(
        invoiceBuffer,
        buyerInfo.phone ||
        buyerInfo.email ||
        booking._id
    );

    // Email
    if (buyerInfo.email) {
        try {
            await sendTicketEmail({
                toEmail: buyerInfo.email,
                name: buyerInfo.name,
                eventTitle: event.title,
                qrBuffer,
                invoiceBuffer,
                tktCod: booking.TktCod,
                invoiceFilename: savedInvoice.filename
            });
        } catch (emailError) {
            console.error(
                'Booking confirmed but ticket email failed:',
                emailError
            );
        }
    }

    return {
        booking,
        invoice: savedInvoice
    };
};

module.exports = {
    confirmBookingAfterPayment
};