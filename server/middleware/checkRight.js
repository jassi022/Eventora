const Right = require('../models/Right');

exports.checkRight = (pageId, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            if (req.user.UsrTyp === 500) return next(); // superadmin bypass

            const right = await Right.findOne({ UsrId: req.user._id, PageId: pageId });
            const field = `Can${action}`;

            if (right && right[field]) return next();

            return res.status(403).json({ message: 'You do not have permission for this action' });
        } catch (error) {
            res.status(500).json({ message: 'Error checking permissions', error: error.message });
        }
    };
};