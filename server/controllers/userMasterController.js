const User = require('../models/User');
const bcrypt = require('bcryptjs'); // ⚠️ confirm — authController.js mein yehi library use hoti hai

exports.createStaffUser = async (req, res) => {
    try {
        if (req.user.UsrTyp !== 500) {
            return res.status(403).json({ message: 'Only the superadmin can create staff users' });
        }
        const { name, email, phone, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ message: 'A user with this email already exists' });

        const lastStaff = await User.findOne({ UsrTyp: { $gte: 501, $lt: 1000 } }).sort({ UsrTyp: -1 });
        const nextUsrTyp = lastStaff ? lastStaff.UsrTyp + 5 : 501;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            role: 'admin', // taaki purane admin-protected routes ko pass kar sake — asli control Rights se aata hai
            isVerified: true,
            UsrTyp: nextUsrTyp,
        });

        const safe = newUser.toObject();
        delete safe.password;
        res.status(201).json(safe);
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

exports.getStaffUsers = async (req, res) => {
    try {
        const users = await User.find({ UsrTyp: { $gte: 501, $lt: 1000 } })
            .select('name email phone UsrTyp isVerified createdAt')
            .sort({ UsrTyp: 1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff users', error: error.message });
    }
};