const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true  
    },
    totalSeats: {   
        type: Number,
        required: true
    },
    availableSeats: {
        type: Number,
        required: true     
    },
    ticketPrice: {
        type: Number,
        required: true  
    },
    imageUrl: {
        type: String,
        required: true  
    },
    createdBy: {    
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},
    {
    timestamps: true
    }
);     
module.exports = mongoose.model('Event', eventSchema);