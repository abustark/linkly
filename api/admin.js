const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const admin = require('./_utils/firebase');

const ADMIN_UIDS = (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!ADMIN_UIDS.length) {
        return res.status(503).json({ error: 'Admin moderation is not configured.' });
    }

    const { authorization } = req.headers || {};
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Sign in required.' });
    }

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(authorization.split('Bearer ')[1]);
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    if (!ADMIN_UIDS.includes(decodedToken.uid)) {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const { shortCode, action } = req.body || {};
    if (!shortCode || typeof shortCode !== 'string') {
        return res.status(400).json({ error: 'shortCode is required.' });
    }
    if (action !== 'disable' && action !== 'enable') {
        return res.status(400).json({ error: 'action must be "disable" or "enable".' });
    }

    try {
        await connectToDatabase();

        let updated;
        if (action === 'disable') {
            updated = await Url.findOneAndUpdate(
                { shortCode },
                { $set: { disabled: true, disabledAt: new Date(), disabledBy: decodedToken.uid } },
                { new: true }
            );
        } else {
            updated = await Url.findOneAndUpdate(
                { shortCode },
                { $set: { disabled: false }, $unset: { disabledAt: 1, disabledBy: 1 } },
                { new: true }
            );
        }

        if (!updated) {
            return res.status(404).json({ error: 'Short URL not found.' });
        }

        return res.status(200).json({
            success: true,
            shortCode: updated.shortCode,
            disabled: !!updated.disabled
        });
    } catch (error) {
        console.error('Admin moderation error:', error);
        return res.status(500).json({ error: 'Could not update this link.' });
    }
};
