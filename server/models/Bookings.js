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
    },
    PassLines: [{
        PassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pass', required: true },
        qty: { type: Number, required: true, min: 1 },
        rate: { type: Number, required: true },
    }],
    tickets: { type: Number, default: 1 },
    PromoCod: { type: String, default: null },
    discount: { type: Number, default: 0 },
    nBookedBy: { type: Number, enum: [500, 1000], default: 1000 },
    GstName: { type: String, default: null },
    GstEmail: { type: String, default: null },
    GstPh: { type: String, default: null },
    TktCod: { type: String, unique: true, sparse: true }, // QR mein encode hone wala unique code
    TktStat: { type: Number, enum: [410, 409], default: 410 }, // 410 = valid, 409 = already verified/used
},
    { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);