const Pass = require('../models/Pass');

exports.getAllPasses = async (req, res) => {
    try {
        const passes = await Pass.find().select('-AvlblPass').sort({ createdAt: -1 });
        res.status(200).json(passes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching passes', error: error.message });
    }
};

// used by the booking dropdown — only active passes
exports.getActivePasses = async (req, res) => {
    try {
        const passes = await Pass.find({ isActive: true }).select('-AvlblPass').sort({ name: 1 });
        res.status(200).json(passes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching passes', error: error.message });
    }
};

exports.createPass = async (req, res) => {
    try {
        const { name, description, price, TtlPass, MaxPerBook, isActive } = req.body;
        if (!name || price === undefined || TtlPass === undefined) {
            return res.status(400).json({ message: 'Name, price and total passes are required' });
        }
        const pass = await Pass.create({
            name,
            description,
            price,
            TtlPass,
            AvlblPass: TtlPass,
            MaxPerBook: MaxPerBook || 10,
            isActive,
        });
        const safe = pass.toObject();
        delete safe.AvlblPass;
        res.status(201).json(safe);
    } catch (error) {
        res.status(500).json({ message: 'Error creating pass', error: error.message });
    }
};

exports.updatePass = async (req, res) => {
    try {
        const { name, description, price, TtlPass, MaxPerBook, isActive } = req.body;
        const pass = await Pass.findById(req.params.id);
        if (!pass) return res.status(404).json({ message: 'Pass not found' });

        if (name !== undefined) pass.name = name;
        if (description !== undefined) pass.description = description;
        if (price !== undefined) pass.price = price;
        if (MaxPerBook !== undefined) pass.MaxPerBook = MaxPerBook;
        if (isActive !== undefined) pass.isActive = isActive;

        if (TtlPass !== undefined && TtlPass !== pass.TtlPass) {
            const diff = TtlPass - pass.TtlPass;
            const newAvlbl = pass.AvlblPass + diff;
            if (newAvlbl < 0) {
                const sold = pass.TtlPass - pass.AvlblPass;
                return res.status(400).json({ message: `Can't go below ${sold} — that many are already sold` });
            }
            pass.TtlPass = TtlPass;
            pass.AvlblPass = newAvlbl;
        }

        await pass.save();
        const safe = pass.toObject();
        delete safe.AvlblPass;
        res.status(200).json(safe);
    } catch (error) {
        res.status(500).json({ message: 'Error updating pass', error: error.message });
    }
};

exports.deletePass = async (req, res) => {
    try {
        const pass = await Pass.findByIdAndDelete(req.params.id);
        if (!pass) return res.status(404).json({ message: 'Pass not found' });
        res.status(200).json({ message: 'Pass deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting pass', error: error.message });
    }
};