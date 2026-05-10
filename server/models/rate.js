const mongoose = require("mongoose");

// schema for rates being displayed (repo and prime rates)

const ratesSchema = new mongoose.Schema(
    {
        repoRate: Number,
        primeRate : Number,
        effDate: Date,
        lastUpdated: {
            type: Date,
            default: Date.now
        },
        source: {
            type: String,
            default: 'SARB API'
        }
    }
);

module.exports = mongoose.model("Rate", ratesSchema);