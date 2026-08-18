const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventID: {
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
    paymentStatus:  {
        type: String,   
        enum: ['unPaid', 'paid'],
        default: 'nonPaid'    
    },
    amount: {
        type: Number,
        required: true
    }
},
{timestamps: true}
); 

module.exports = mongoose.model('Booking', bookingSchema);