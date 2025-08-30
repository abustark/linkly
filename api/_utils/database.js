// api/_utils/database.js

const mongoose = require('mongoose');

// We need to cache the connection so we don't have to reconnect on every function call.
let cachedDb = null;

// This function connects to our database
async function connectToDatabase() {
    // If we're already connected, reuse the existing connection.
    if (cachedDb) {
        return cachedDb;
    }

    try {
        // Connect to the database using the MONGODB_URI from our environment variables
        const db = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Cache the connection for future use
        cachedDb = db;
        return db;

    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw new Error('Could not connect to database');
    }
}

module.exports = connectToDatabase;