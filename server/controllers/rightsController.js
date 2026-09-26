const User = require('../models/User');
const Right = require('../models/Right');

// ---- purana CanCncl (booking-cancel) rights system ----
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({
            UsrTyp: { $gte: 501, $lt: 1000 },
        })
            .select("name email phone UsrTyp isVerified createdAt")
            .sort({ UsrTyp: 1 });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching staff users",
            error: error.message,
        });
    }
};

exports.updateUserRights = async (req, res) => {
    try {
        const { CanCncl } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (!user.Rights) {
            user.Rights = {};
        }

        if (CanCncl !== undefined) {
            user.Rights.CanCncl = CanCncl;
        }

        await user.save();

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({
            message: "Error updating rights",
            error: error.message,
        });
    }
};

// ---- naya page-based rights system ----
exports.getAllRights = async (req, res) => {
    try {
        const rights = await Right.find()
            .populate("UsrId", "name email UsrTyp");

        res.status(200).json(rights);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching rights",
            error: error.message,
        });
    }
};


exports.getMyRights = async (req, res) => {
    try {
        // Superadmin gets access to everything
        if (req.user.UsrTyp === 500) {
            return res.status(200).json({
                isSuperadmin: true,
                rights: [],
            });
        }

        const rights = await Right.find({
            UsrId: req.user._id,
        });

        res.status(200).json({
            isSuperadmin: false,
            rights,
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching your rights",
            error: error.message,
        });
    }
};

exports.upsertRight = async (req, res) => {
    try {
        const {
            userId,
            pageId,
            CanAdd,
            CanEdit,
            CanView,
            CanDelete,
        } = req.body;

        if (!userId || !pageId) {
            return res.status(400).json({
                message: "User and page are required",
            });
        }

        // Make sure selected user is actually a staff user
        const user = await User.findOne({
            _id: userId,
            UsrTyp: { $gte: 501, $lt: 1000 },
        });

        if (!user) {
            return res.status(404).json({
                message: "Staff user not found",
            });
        }

        const right = await Right.findOneAndUpdate(
            {
                UsrId: userId,
                PageId: pageId,
            },
            {
                $set: {
                    CanAdd: !!CanAdd,
                    CanEdit: !!CanEdit,
                    CanView: !!CanView,
                    CanDelete: !!CanDelete,
                },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );

        res.status(200).json(right);
    } catch (error) {
        res.status(500).json({
            message: "Error saving right",
            error: error.message,
        });
    }
};