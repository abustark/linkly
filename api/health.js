const mongoose = require('mongoose');
const connectToDatabase = require('./_utils/database');

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        await connectToDatabase();
        if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
            throw new Error('Database is not connected');
        }
        await mongoose.connection.db.admin().ping();
        return res.status(200).json({
            status: 'ok',
            database: 'up',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        return res.status(503).json({
            status: 'error',
            database: 'down',
            timestamp: new Date().toISOString()
        });
    }
};
