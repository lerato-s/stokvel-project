const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const cors = require('cors'); // allows frontend to talk to API(backend)
require('dotenv').config(); // reads .env file and loads vars to process.env

const app = express(); // creates api application
app.use(cors()); // tells API to allow requests from frontend
app.use(express.json());

const PORT = 5000;
const uri = process.env.MONGODB_URI;
let db;

async function connectDB() {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db('stokvel_db');
    console.log('Connected to DB');
}



app.post('/api/auth/forgot-password', async (req, res) => {
    
    res.json({ message: "still busy eish" });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(` API running on http://localhost:${PORT}`);
    });
});