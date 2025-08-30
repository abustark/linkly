// Import our new database utility and the Url model from their new locations
const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');

// This is the serverless function handler
module.exports = async (req, res) => {
    // Connect to the database on-demand
    await connectToDatabase();

    // In Vercel, dynamic path parameters are in req.query
    const { shortCode } = req.query;

    try {
        // Find the URL document in the database
        const url = await Url.findOne({ shortCode: shortCode });

        if (!url) {
            // If no URL is found, send a 404 Not Found error
            return res.status(404).json({ error: 'Short URL not found' });
        }

        // Increment the click count and save the document
        url.clickCount += 1;
        await url.save();

        // Perform the redirect to the original URL
        // We use a 301 status code for a permanent redirect
        res.redirect(301, url.originalUrl);

    } catch (error) {
        console.error('Redirect error:', error);
        // If any other error occurs, send a 500 Server Error
        res.status(500).json({ error: 'Error redirecting URL' });
    }
};