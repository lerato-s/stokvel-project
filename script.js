const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB, getDB } = require('./db/db.js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;


app.get('/api/health', async (req, res) => {
    try {
        const db = getDB();
        await db.command({ ping: 1 });
        res.json({ status: 'ok', message: 'Database connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

startServer();