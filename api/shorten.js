// Import our utilities and model
const connectToDatabase = require('./_utils/database');
const { generateShortCode } = require('./_utils/generateCode');
const Url = require('./_models/Url');

// We need to import the Firebase Admin SDK to verify the user's token
const admin = require('firebase-admin');

// --- Firebase Admin Initialization ---
// This is a critical pattern for serverless. We only initialize the app once.
let serviceAccount;
// Check if running in a production environment (like Vercel)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // For local development, it will look for the file in the `api` directory
    serviceAccount = require('./serviceAccountKey.json');
}

// Initialize the app if it hasn't been already
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
// --- End Firebase Initialization ---


// The main serverless function handler
module.exports = async (req, res) => {
    // Vercel's default behavior is to parse the body for POST requests
    const { originalUrl, customAlias } = req.body;

    // We only accept POST requests for this endpoint
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // --- User Authentication ---
        let userId = null;
        const { authorization } = req.headers;

        if (authorization && authorization.startsWith('Bearer ')) {
            const idToken = authorization.split('Bearer ')[1];
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (error) {
                // Token is invalid or expired, treat as an anonymous user
                console.log('Invalid or expired token. Proceeding as anonymous.');
            }
        }
        // --- End User Authentication ---

        // Connect to the database
        await connectToDatabase();

        const trimmedUrl = originalUrl.trim();
        new URL(trimmedUrl); // Validate URL format

        let shortCode = customAlias;
        if (shortCode) {
            const existing = await Url.findOne({ shortCode: shortCode });
            if (existing) {
                return res.status(409).json({ error: 'This custom alias is already in use.' });
            }
        } else {
            shortCode = generateShortCode();
        }
        
        const newUrlData = {
            originalUrl: trimmedUrl,
            shortCode: shortCode,
            userId: userId // Add the user's ID if they are authenticated
        };

        const newUrl = new Url(newUrlData);
        await newUrl.save();

        // The URL of the deployed Vercel app is available in `req.headers['x-forwarded-host']`
          const protocol = req.headers['x-forwarded-proto'] || 'http';
        // The 'x-forwarded-host' header gives us the domain name (e.g., linkly.vercel.app)
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        
        const shortUrl = `${protocol}://${host}/${newUrl.shortCode}`;

        res.status(201).json({
            originalUrl: newUrl.originalUrl,
            shortUrl: shortUrl,
            ownedByUser: !!newUrl.userId
        });

    } catch (error) {
        if (error.message.includes('Invalid URL')) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        console.error('Shorten error:', error);
        res.status(500).json({ error: 'Error creating short URL' });
    }
};