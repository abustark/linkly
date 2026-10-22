const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const Click = require('./_models/Click');
const admin = require('./_utils/firebase');

const REAUTH_WINDOW_SECONDS = 10 * 60;

module.exports = async (req, res) => {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', 'DELETE');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { authorization } = req.headers || {};
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Sign in required to delete your account.' });
    }

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(authorization.split('Bearer ')[1]);
    } catch (error) {
        return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    }

    // Account deletion is irreversible, so require a recently-issued token.
    const authTime = Number(decodedToken.auth_time);
    if (Number.isFinite(authTime) && Date.now() / 1000 - authTime > REAUTH_WINDOW_SECONDS) {
        return res.status(403).json({
            error: 'Please sign in again before deleting your account.',
            code: 'reauth_required'
        });
    }

    const userId = decodedToken.uid;

    try {
        await connectToDatabase();

        const links = await Url.find({ userId }).select('shortCode').lean();
        const codes = links.map((link) => link.shortCode).filter(Boolean);
        const clickFilter = codes.length
            ? { $or: [{ userId }, { shortCode: { $in: codes } }] }
            : { userId };
        // Remove clicks first so a partial failure can be retried safely.
        const clickResult = await Click.deleteMany(clickFilter);
        const linkResult = await Url.deleteMany({ userId });

        try {
            await admin.auth().deleteUser(userId);
        } catch (error) {
            // Treat a previously removed Firebase user as an idempotent success.
            if (!error || error.code !== 'auth/user-not-found') throw error;
        }

        return res.status(200).json({
            success: true,
            deletedLinks: (linkResult && linkResult.deletedCount) || links.length,
            deletedClicks: (clickResult && clickResult.deletedCount) || 0
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        return res.status(500).json({ error: 'Could not delete your account. Please try again.' });
    }
};
