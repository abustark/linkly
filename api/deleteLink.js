const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const admin = require('./_utils/firebase');

module.exports = async (req, res) => {
    if (req.method !== 'DELETE') {
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

        const { shortCode } = req.query;
        if (!shortCode) {
            return res.status(400).json({ error: 'shortCode is required' });
        }

        const url = await Url.findOne({ shortCode: shortCode });
        if (!url) {
            return res.status(404).json({ error: 'Short URL not found' });
        }

        if (url.userId && url.userId !== decodedToken.uid) {
            return res.status(403).json({ error: 'You do not have permission to delete this link.' });
        }

        await Url.deleteOne({ _id: url._id });

        res.status(200).json({ success: true, shortCode: url.shortCode });
    } catch (error) {
        console.error('Delete link error:', error);
        res.status(500).json({ error: 'An error occurred while deleting the link.' });
    }
};
