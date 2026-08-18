const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        user: process.env.EMAIL_PASS
    }
});

const sendOtpEmail = async (userEmail, otp, type) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: type === 'account_verification' ? 'Account Verification OTP' : 'Event Booking OTP',
            text: `Your OTP for ${type === 'account_verification' ? 'account verification' : 'event booking'} is: ${otp}. It will expire in 5 minutes.`
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${userEmail} with OTP: ${otp}`);
    }
    catch (error) {
        console.error(`Error sending email to ${userEmail}:`, error);
    }
};


const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Event Booking Confirmation For ${eventTitle}`,
            text: `Hello ${userName},\n\nYour booking for the event "${eventTitle}" has been confirmed.`
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${userEmail} with booking details: ${eventTitle}`);
    }
    catch (error) {
        console.error(`Error sending email to ${userEmail}:`, error);
    }
};