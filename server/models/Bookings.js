const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    tickets: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['unPaid', 'paid'],
        default: 'unPaid'   // was 'nonPaid' — not a valid enum value, would throw if ever relied on
    },
    amount: {
        type: Number,
        required: true
    }
},
    { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);