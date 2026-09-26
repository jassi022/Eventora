const mongoose = require('mongoose');
const {
    BOOKING_STATUS,
    PAYMENT_STATUS,
    PAYMENT_GATEWAY
} = require('../constants');

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
            index: true
        },

        status: {
            type: Number,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.PAYMENT_PENDING,
            index: true
        },

        paymentStatus: {
            type: Number,
            enum: Object.values(PAYMENT_STATUS),
            default: PAYMENT_STATUS.PENDING,
            index: true
        },

        paymentGateway: {
            type: Number,
            enum: Object.values(PAYMENT_GATEWAY),
            required: true
        },

        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
            default: null
        },

        tickets: {
            type: Number,
            required: true,
            min: 1
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        utr: {
            type: String,
            default: null,
            trim: true,
        },
        PassLines: [
            {
                PassId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Pass',
                    required: true
                },

                qty: {
                    type: Number,
                    required: true,
                    min: 1
                },

                rate: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        PromoCod: {
            type: String,
            default: null
        },

        discount: {
            type: Number,
            default: 0,
            min: 0
        },

        nBookedBy: {
            type: Number,
            enum: [500, 1000],
            default: 1000
        },

        GstName: {
            type: String,
            default: null
        },

        GstEmail: {
            type: String,
            default: null
        },

        GstPh: {
            type: String,
            default: null
        },

        TktCod: {
            type: String,
            unique: true,
            sparse: true
        },

        TktStat: {
            type: Number,
            enum: [410, 409,400],
            default: 410
        },  

        TktActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Booking', bookingSchema);