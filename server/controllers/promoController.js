const Promo = require('../models/Promo');

exports.getAllPromos = async (req, res) => {
    try {
        const promos = await Promo.find().sort({ createdAt: -1 });
        res.status(200).json(promos);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching promo codes', error: error.message });
    }
};

exports.createPromo = async (req, res) => {
    try {
        const { Cod, Typ, Val, MinAmt, ExpDt, IsActv } = req.body;
        if (!Cod || !Typ || Val === undefined || MinAmt === undefined || !ExpDt) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const promo = await Promo.create({ Cod, Typ, Val, MinAmt, ExpDt, IsActv });
        res.status(201).json(promo);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This promo code already exists' });
        }
        res.status(500).json({ message: 'Error creating promo code', error: error.message });
    }
};

exports.updatePromo = async (req, res) => {
    try {
        const { Cod, Typ, Val, MinAmt, ExpDt, IsActv } = req.body;
        const promo = await Promo.findById(req.params.id);
        if (!promo) return res.status(404).json({ message: 'Promo code not found' });

        if (Cod !== undefined) promo.Cod = Cod;
        if (Typ !== undefined) promo.Typ = Typ;
        if (Val !== undefined) promo.Val = Val;
        if (MinAmt !== undefined) promo.MinAmt = MinAmt;
        if (ExpDt !== undefined) promo.ExpDt = ExpDt;
        if (IsActv !== undefined) promo.IsActv = IsActv;

        await promo.save();
        res.status(200).json(promo);
    } catch (error) {
        res.status(500).json({ message: 'Error updating promo code', error: error.message });
    }
};

exports.deletePromo = async (req, res) => {
    try {
        const promo = await Promo.findByIdAndDelete(req.params.id);
        if (!promo) return res.status(404).json({ message: 'Promo code not found' });
        res.status(200).json({ message: 'Promo code deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting promo code', error: error.message });
    }
};

// hit by the user-facing "Apply" button
exports.validatePromo = async (req, res) => {
    try {
        const { Cod, amount } = req.body;
        if (!Cod || amount === undefined) {
            return res.status(400).json({ message: 'Promo code and amount are required' });
        }
        const promo = await Promo.findOne({ Cod: Cod.trim().toUpperCase() });
        if (!promo || !promo.IsActv) {
            return res.status(404).json({ message: 'Invalid promo code' });
        }
        if (new Date(promo.ExpDt) < new Date()) {
            return res.status(400).json({ message: 'This promo code has expired' });
        }
        if (amount < promo.MinAmt) {
            return res.status(400).json({
                message: `This code needs a minimum order of ₹${promo.MinAmt}. Add ₹${promo.MinAmt - amount} more.`,
            });
        }

        const discount = promo.Typ === 'percent'
            ? Math.round((amount * promo.Val) / 100)
            : Math.min(promo.Val, amount);

        res.status(200).json({
            Cod: promo.Cod,
            Typ: promo.Typ,
            Val: promo.Val,
            discount,
            finalAmount: amount - discount,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error validating promo code', error: error.message });
    }
};