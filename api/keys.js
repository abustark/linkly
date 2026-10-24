const connectToDatabase = require('./_utils/database');
const ApiKey = require('./_models/ApiKey');
const admin = require('./_utils/firebase');
const { checkRateLimit } = require('./_utils/rateLimit');
const { createApiKey, publicKeyView } = require('./_utils/apiKeys');

async function verify(req, res) {
    const { authorization } = req.headers || {};
    if (!authorization || !authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Sign in required to manage API keys.' });
        return null;
    }
    try {
        return await admin.auth().verifyIdToken(authorization.split('Bearer ')[1]);
    } catch (error) {
        res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
        return null;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
        try {
            const decodedToken = await verify(req, res);
            if (!decodedToken) return;

            await connectToDatabase();
            const keys = await ApiKey.find({ userId: decodedToken.uid })
                .sort({ createdAt: -1 })
                .limit(50);

            return res.status(200).json({ keys: keys.map(publicKeyView) });
        } catch (error) {
            console.error('List API keys error:', error);
            return res.status(500).json({ error: 'Could not load API keys.' });
        }
    }

    if (req.method === 'POST') {
        try {
            const decodedToken = await verify(req, res);
            if (!decodedToken) return;

            const rate = await checkRateLimit(decodedToken.uid, 'api-key-create', {
                max: 10,
                windowMs: 3600000
            });
            if (rate.limited) {
                res.setHeader('Retry-After', String(rate.retryAfterSec || 60));
                return res.status(429).json({ error: 'Too many keys created. Please try again later.' });
            }

            await connectToDatabase();

            const rawName = String((req.body && req.body.name) || '').trim();
            if (rawName.length > 60) {
                return res.status(400).json({ error: 'Key name must be 60 characters or fewer.' });
            }

            const created = await createApiKey(decodedToken.uid, rawName || 'Default key');
            if (created.error) {
                return res.status(409).json({ error: created.error });
            }

            return res.status(201).json({
                key: created.key,
                record: publicKeyView(created.record)
            });
        } catch (error) {
            console.error('Create API key error:', error);
            return res.status(500).json({ error: 'Could not create an API key.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const decodedToken = await verify(req, res);
            if (!decodedToken) return;

            const id = String(req.query.id || '').trim();
            if (!id) {
                return res.status(400).json({ error: 'id is required.' });
            }

            await connectToDatabase();
            const record = await ApiKey.findOne({ _id: id, userId: decodedToken.uid });
            if (!record) {
                return res.status(404).json({ error: 'API key not found.' });
            }
            if (!record.revokedAt) {
                record.revokedAt = new Date();
                await record.save();
            }

            return res.status(200).json({ success: true, id: String(record._id) });
        } catch (error) {
            console.error('Revoke API key error:', error);
            return res.status(500).json({ error: 'Could not revoke the API key.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
};
