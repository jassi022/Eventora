const Pass = require('../models/pass');

exports.getAllPasses = async (req, res) => {
    try {
        const passes = await Pass.find().sort({ createdAt: -1 });
        res.status(200).json(passes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching passes', error: error.message });
    }
};

exports.createPass = async (req, res) => {
    try {
        const { name, description, price, isActive } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ message: 'Name and price are required' });
        }
        const pass = await Pass.create({ name, description, price, isActive });
        res.status(201).json(pass);
    } catch (error) {
        res.status(500).json({ message: 'Error creating pass', error: error.message });
    }
};

exports.updatePass = async (req, res) => {
    try {
        const { name, description, price, isActive } = req.body;
        const pass = await Pass.findById(req.params.id);
        if (!pass) {
            return res.status(404).json({ message: 'Pass not found' });
        }
        if (name !== undefined) pass.name = name;
        if (description !== undefined) pass.description = description;
        if (price !== undefined) pass.price = price;
        if (isActive !== undefined) pass.isActive = isActive;
        await pass.save();
        res.status(200).json(pass);
    } catch (error) {
        res.status(500).json({ message: 'Error updating pass', error: error.message });
    }
};

exports.deletePass = async (req, res) => {
    try {
        const pass = await Pass.findByIdAndDelete(req.params.id);
        if (!pass) {
            return res.status(404).json({ message: 'Pass not found' });
        }
        res.status(200).json({ message: 'Pass deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting pass', error: error.message });
    }
};