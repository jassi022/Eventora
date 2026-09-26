const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Generic, reusable email sender — OTP, booking confirmation, ticket, kahin bhi use karo
 * @param {Object} params
 * @param {string} params.to - recipient email
 * @param {string} params.subject - email subject
 * @param {string} params.message - HTML body (agar plain text chahiye to text bhi de sakte ho)
 * @param {string} [params.text] - optional plain text fallback
 * @param {Array}  [params.attachments] - optional, [{ filename, content }]
 */
const sendEmail = async ({ to, subject, message, text, attachments = [] }) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to,
            subject,
            ...(message ? { html: message } : {}),
            ...(text ? { text } : {}),
            attachments,
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to} — subject: "${subject}"`, `- message: "${message || text}"`);
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw error; // caller decide kare ki booking fail karni hai ya sirf log karna hai
    }
};

const sendOtpEmail = async (userEmail, otp, type) => {
    const subject = type === 'account_verification' ? 'Account Verification OTP' : 'Event Booking OTP';
    const text = `Your OTP for ${type === 'account_verification' ? 'account verification' : 'event booking'} is: ${otp}. It will expire in 5 minutes.`;
    try {
        await sendEmail({ to: userEmail, subject, text });
    } catch (error) {
        // purane behavior jaisa — OTP fail hone par bhi crash na ho, sirf log ho
    }
};

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    const subject = `Event Booking Confirmation For ${eventTitle}`;
    const text = `Hello ${userName},\n\nYour booking for the event "${eventTitle}" has been confirmed.`;
    try {
        await sendEmail({ to: userEmail, subject, text });
    } catch (error) {
        // purane behavior jaisa
    }
};

/**
 * Ticket email — QR + invoice PDF attach, event title ke naam ki subject
 * @param {Object} params
 * @param {string} params.toEmail
 * @param {string} params.name
 * @param {string} params.eventTitle
 * @param {Buffer} params.qrBuffer
 * @param {Buffer} params.invoiceBuffer
 * @param {string} params.tktCod
 * @param {string} [params.invoiceFilename]
 */
const sendTicketEmail = async ({ toEmail, name, eventTitle, qrBuffer, invoiceBuffer, tktCod, invoiceFilename }) => {
    const subject = `Your ticket for ${eventTitle} is confirmed! 🎟️`;
    const message = `
        <h2>Booking Confirmed — ${eventTitle}</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your ticket has been booked successfully.</p>
        <p><strong>Ticket No:</strong> ${tktCod}</p>
        <p>Show the attached QR code at entry for scanning.</p>
        <p>Your invoice is attached as a PDF, and will also be displayed on your mail.</p>
        <p>See you at the event!</p>
    `;
    const attachments = [
        { filename: 'ticket-qr.png', content: qrBuffer },
        { filename: invoiceFilename || 'invoice.pdf', content: invoiceBuffer },
    ];
    await sendEmail({ to: toEmail, subject, message, attachments });
};
exports.sendPaymentApprovedEmail = async ({ toEmail, name, eventTitle }) => {
    const subject = `Payment approved for ${eventTitle}`;
    const text = `Hi ${name}, your payment for "${eventTitle}" has been verified. Your ticket is on its way.`;
    try { await sendEmail({ to: toEmail, subject, text }); } catch (e) { console.error(e); }
};

exports.sendBookingRevertedEmail = async ({ toEmail, name, eventTitle, tktCod, message }) => {
    const subject = `Update on your booking for ${eventTitle}`;
    const text = `Hi ${name},\n\n${message}\n\nTicket: ${tktCod || 'N/A'}`;
    try { await sendEmail({ to: toEmail, subject, text }); } catch (e) { console.error(e); }
};
exports.sendEmail = sendEmail;
exports.sendOtpEmail = sendOtpEmail;
exports.sendBookingEmail = sendBookingEmail;
exports.sendbookingEmail = sendBookingEmail; // ⚠️ lowercase alias — bookingController.js isi naam se import karta hai
exports.sendTicketEmail = sendTicketEmail;