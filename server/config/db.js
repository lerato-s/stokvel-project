// server/config/db.js
const { MongoClient } = require('mongodb');

let db = null;

async function connectDB() {
    if (db) return db;
    
    try {
        const uri = process.env.MONGODB_URI;
        const client = new MongoClient(uri);
        await client.connect();
        db = client.db('stokvelDB');
        console.log('✅ Database connected successfully');
        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

function getDB() {
    if (!db) throw new Error('Database not connected. Call connectDB() first.');
    return db;
}

module.exports = { connectDB, getDB };