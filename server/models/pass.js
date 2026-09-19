const mongoose = require('mongoose');

const passSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        price: { type: Number, required: true, min: 0 },
        TtlPass: { type: Number, required: true, min: 0, default: 0 },   // total passes created
        AvlblPass: { type: Number, required: true, min: 0, default: 0 }, // remaining stock — DB ONLY, never sent to any client
        isActive: { type: Boolean, default: true },
        MaxPerBook: { type: Number, required: true, min: 1, default: 10 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Pass', passSchema);