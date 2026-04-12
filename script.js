const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const uri = process.env.MONGODB_URI;
let db;

async function connectDB() {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db('stokvel_db');
    console.log('Connected to database');
}

// Health check endpoint for everyone to use
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});