const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const admin = require('./_utils/firebase');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { authorization } = req.headers;

        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
        }

        const idToken = authorization.split('Bearer ')[1];
        let decodedToken;
        
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
        }

        await connectToDatabase();

        const userLinks = await Url.find({ userId: decodedToken.uid }).sort({ createdAt: -1 });
        
        res.status(200).json(userLinks);

    } catch (error) {
        console.error('Get links error:', error);
        res.status(500).json({ error: 'An error occurred while fetching your links.' });
    }
};