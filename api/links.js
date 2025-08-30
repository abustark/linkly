// Import our utilities and model
const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const admin = require('firebase-admin');

// --- Firebase Admin Initialization (same pattern as before) ---
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    serviceAccount = require('./serviceAccountKey.json');
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
// --- End Firebase Initialization ---

// The main serverless function handler
module.exports = async (req, res) => {
    // This endpoint only accepts GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // --- User Authentication (This route is protected) ---
        const { authorization } = req.headers;

        // If no authorization header is provided, deny access
        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
        }

        const idToken = authorization.split('Bearer ')[1];
        let decodedToken;
        
        try {
            // Verify the token using Firebase Admin
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            // If the token is invalid (e.g., expired), deny access
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
        }
        // --- End User Authentication ---

        // Connect to the database
        await connectToDatabase();

        // Find all URLs where the userId matches the authenticated user's UID
        const userLinks = await Url.find({ userId: decodedToken.uid }).sort({ createdAt: -1 });
        
        // Send the list of links back to the client
        res.status(200).json(userLinks);

    } catch (error) {
        console.error('Get links error:', error);
        res.status(500).json({ error: 'An error occurred while fetching your links.' });
    }
};