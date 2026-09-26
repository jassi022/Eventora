const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: { type: String, default: null },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false  
    },
    Rights: {
        CanCncl: { type: Boolean, default: false }, // normal user apni booking cancel kar sake
    },
    UsrTyp: { type: Number, default: 1000 },
});

module.exports = mongoose.model('User', userSchema);