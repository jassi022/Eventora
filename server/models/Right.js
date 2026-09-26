const mongoose = require('mongoose');

const rightSchema = new mongoose.Schema(
    {
        UsrId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        PageId: { type: Number, required: true },
        CanAdd: { type: Boolean, default: false },
        CanEdit: { type: Boolean, default: false },
        CanView: { type: Boolean, default: false },
        CanDelete: { type: Boolean, default: false },
        CanApprove: { type: Boolean, default: false },
    },
    { timestamps: true }
);

rightSchema.index({ UsrId: 1, PageId: 1 }, { unique: true });

module.exports = mongoose.model('Right', rightSchema);