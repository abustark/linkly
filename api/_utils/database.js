// api/_utils/database.js

const mongoose = require('mongoose');

// Cache the connection across warm Vercel function invocations.
let cachedDb = global.mongooseConnection;
let cachedPromise = global.mongooseConnectionPromise;

// This function connects to our database
async function connectToDatabase() {
    // If we're already connected, reuse the existing connection.
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('Missing MONGODB_URI environment variable');
    }

    try {
        if (!cachedPromise) {
            // Connect to the database using the MONGODB_URI from our environment variables.
            cachedPromise = mongoose.connect(process.env.MONGODB_URI, {
                bufferCommands: false,
                serverSelectionTimeoutMS: 10000,
            });
            global.mongooseConnectionPromise = cachedPromise;
        }

        const db = await cachedPromise;

        // Cache the connection for future use
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
