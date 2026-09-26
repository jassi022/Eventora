const CtrlRm = require('../models/CtrlRm');
const {
    PAYMENT_GATEWAY
} = require('../constants');

const getActivePaymentGateway = async () => {
    const config = await CtrlRm.findOne({
        IsActive: true
    }).lean();

    if (!config) {
        throw new Error('Payment gateway configuration not found');
    }

    if (!Object.values(PAYMENT_GATEWAY).includes(config.GateWay_Type)) {
        throw new Error('Invalid payment gateway configuration');
    }

    return config.GateWay_Type;
};

module.exports = {
    getActivePaymentGateway
};