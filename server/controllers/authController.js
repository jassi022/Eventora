const User = require('../models/User');
const bcrypt = require('bcryptjs');
const OTP = require('../models/OTP');
const { sendOtpEmail } = require('../utils/email');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '3d' }); // ab 3 din usko login nhi krna pdega
}
exports.registerUser = async (req, res) => {

    const { name, email, phone, password } = req.body; // request.body m hum data bhj te h frontend se

    let userExists = await User.findOne({ email: email.toLowerCase() }); //user ka email check kr rhe h ki user exist krta h ya nhi
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    try {
        const user = await User.create({ name, email, password: hashedPassword, role: 'user', isVerified: false });
        await user.save();

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Generated OTP for ${email}: ${otp}`);
        await OTP.create({ email, otp, action: 'account_verification' });
        await sendOtpEmail(email, otp, 'account_verification');

        res.status(201).json(
            {
                message: 'User registered successfully. Please verify your email with the OTP sent.',
                email: user.email
            }); //postman m bhj dia h 201 ka status code ka mtlb h ki resource create ho gya h successfully

    }
    catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid password' });
    }

    if (!user.isVerified && user.role === 'user') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.deleteMany({ email, action: 'account_verification' }); // Delete any existing OTPs for this email
        await OTP.create({ email, otp, action: 'account_verification' });
        await sendOtpEmail(email, otp, 'account_verification');
        return res.status(400).json(
            {
                message: 'Please verify your email before logging in'
            });
    }

    res.status(200).json(
        {
            message: 'Login successful',
            _id: user._id,
            name: user.name,
            email: user.email,
            phone : user.phone,
            role: user.role,
            token: generateToken(user._id, user.role)
        });
};

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    const otpRecord = await OTP.findOne({ email, otp, action: 'account_verification' });
    if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOneAndUpdate({ email }, { isVerified: true });
    await OTP.deleteMany({ email, action: 'account_verification' }); // Delete the OTP after successful verification
    res.status(200).json(
        {
            message: 'Email verified successfully. You can now log in.',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        });
};