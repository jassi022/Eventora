const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema(
    {
        Cod: { type: String, required: true, unique: true, uppercase: true, trim: true },
        Typ: { type: String, enum: ['percent', 'amount'], required: true },
        Val: { type: Number, required: true, min: 0 },
        MinAmt: { type: Number, required: true, min: 0 },
        ExpDt: { type: Date, required: true },
        IsActv: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Promo', promoSchema);