const axios = require('axios');
const Rate = require('../models/rate'); 
const cron = require('node-cron');


const sarb_url = 'https://custom.resbank.co.za/SarbWebApi/WebIndicators/CurrentMarketRates';

async function fetchAndStoreSARBRates() {
    try {
        
        const response = await axios.get(sarb_url);
        const rates = response.data;

        const repoEntry = rates.find(r => r.TimeseriesCode == "MMRD002A"); // find rate via time series code 

        //no repo rate found, just use most recent existing rate saved
        if (!repoEntry) {
            console.warn('repo rate not found, using last known data');
            return null;
        }

        const repoRate = parseFloat(repoEntry.Value); //convert from string to float so we can uise it to calc primeRate
        const primeRate = repoRate + 3.5; // mathematically related

        const newRate = new Rate({
            repoRate,
            primeRate,
            effDate: new Date(repoEntry.Date), // date implemented/decided
            lastUpdated: new Date()

        });


        await newRate.save();
        console.log(`Rates updated: Repo=${repoRate}%, Prime=${primeRate}%`);
        return newRate;

    } catch (error) {
        console.error("Failed to fetch SARB rates:", error.message);
        return null;
    }
}

fetchAndStoreSARBRates();


cron.schedule('0 */6 * * *', async () => {
    console.log('Fetching SA Repo Rate from SARB API');
    await fetchAndStoreSARBRates();
});

module.exports = { fetchAndStoreSARBRates };