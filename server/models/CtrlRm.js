const mongoose = require('mongoose');
const { PAYMENT_GATEWAY } = require('../constants');

const ctrlRmSchema = new mongoose.Schema(
    {
        GateWay_Type: {
            type: Number,
            required: true,
            enum: Object.values(PAYMENT_GATEWAY),
            default: PAYMENT_GATEWAY.UTR_BASED
        },

        IsActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        collection: 'CtrlRm'
    }
);

module.exports = mongoose.model('CtrlRm', ctrlRmSchema);