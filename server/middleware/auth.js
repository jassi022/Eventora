const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token = req.headers.authorization && req.headers.authorization.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'User no longer exists. Please log in again.' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Token is not valid' });
        }
    } else {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }
}

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        return res.status(403).json({ message: 'Admin access required' });
    }
}

const rightsYN = (req, res, next) => {
    if (req.user && req.user.Rights || req.user.UsrTyp === 500) {
        next(); 
    } else {
        return res.status(403).json({ message: 'Rights not assigned to this user' });
    }
}
module.exports = { protect, admin, rightsYN };