const User = require('../models/User'); // apne actual User model path se match karo

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('name email Rights');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

exports.updateUserRights = async (req, res) => {
    try {
        const { CanCncl } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.Rights) user.Rights = {};
        if (CanCncl !== undefined) user.Rights.CanCncl = CanCncl;
        await user.save();
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating rights', error: error.message });
    }
};