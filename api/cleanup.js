const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const Click = require('./_models/Click');

const BATCH_SIZE = 500;
const MAX_BATCHES = 10;

function authorized(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return String((req.headers && req.headers.authorization) || '') === `Bearer ${secret}`;
}

module.exports = async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.CRON_SECRET) {
        return res.status(503).json({ error: 'CRON_SECRET is not configured.' });
    }
    if (!authorized(req)) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        await connectToDatabase();

        let deletedLinks = 0;
        let deletedClicks = 0;

        for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
            const expired = await Url.find({ expiresAt: { $ne: null, $lte: new Date() } })
                .select('shortCode')
                .limit(BATCH_SIZE)
                .lean();

            if (!expired.length) break;

            const ids = expired.map((row) => row._id);
            const codes = expired.map((row) => row.shortCode).filter(Boolean);
            const [linkResult, clickResult] = await Promise.all([
                Url.deleteMany({ _id: { $in: ids } }),
                codes.length ? Click.deleteMany({ shortCode: { $in: codes } }) : Promise.resolve({ deletedCount: 0 })
            ]);

            deletedLinks += (linkResult && linkResult.deletedCount) || 0;
            deletedClicks += (clickResult && clickResult.deletedCount) || 0;

            if (expired.length < BATCH_SIZE) break;
        }

        return res.status(200).json({ success: true, deletedLinks, deletedClicks });
    } catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ error: 'Cleanup failed.' });
    }
};
