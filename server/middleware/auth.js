const jwt = require('jsonwebtoken');
const User = require('../models/User');

//user authentication middleware
const protect = async (req, res, next) => {
    let token = req.headers.authorization && req.headers.authorization.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null;
    if(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();//next yani middleware ka kam khtms
        } catch (error) {
            return res.status(401).json({ message: 'Token is not valid' });
        }
    } else {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }
}

const admin = (req, res, next) => {
    if(req.user && req.user.role === 'admin') {
        next();
    }   
    else {
        return res.status(403).json({ message: 'Admin access required' });
    }   
}

module.exports = { protect, admin };