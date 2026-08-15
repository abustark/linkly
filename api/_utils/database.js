const mongoose = require('mongoose');

// Cache the connection across warm Vercel function invocations.
let cachedDb = global.mongooseConnection;
let cachedPromise = global.mongooseConnectionPromise;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('Missing MONGODB_URI environment variable');
    }

    try {
        if (!cachedPromise) {
            cachedPromise = mongoose.connect(process.env.MONGODB_URI, {
                bufferCommands: false,
                serverSelectionTimeoutMS: 10000,
            });
            global.mongooseConnectionPromise = cachedPromise;
        }

        const db = await cachedPromise;

        cachedDb = db;
        global.mongooseConnection = db;
        return db;

    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedPromise = null;
        global.mongooseConnectionPromise = null;
        throw new Error('Could not connect to database');
    }
}

module.exports = connectToDatabase;
