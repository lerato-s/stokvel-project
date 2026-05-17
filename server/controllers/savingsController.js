const { calculateSavingsGrowth } = require('../services/savingsGrowth');
const Rate = require('../models/rate');

async function getSavingsProjection(req, res) {
    try {
        const { amount, frequency, cycle } = req.query;
        
        // get the latest rate from DB
        const rate = await Rate.findOne().sort({ lastUpdated: -1 });
        
        const result = calculateSavingsGrowth(amount, frequency, cycle, rate.primeRate);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { getSavingsProjection };