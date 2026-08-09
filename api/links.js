const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const admin = require('./_utils/firebase');

module.exports = async (req, res) => {
    if (req.method === 'GET') {
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

            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
            const skip = (page - 1) * pageSize;

            const query = { userId: decodedToken.uid };

            if (req.query.range === '7d') {
                query.createdAt = { $gte: new Date(Date.now() - 7 * 86400000) };
            } else if (req.query.range === '30d') {
                query.createdAt = { $gte: new Date(Date.now() - 30 * 86400000) };
            }

            const search = (req.query.q || '').trim().toLowerCase();
            if (search) {
                query.$or = [
                    { originalUrl: { $regex: search, $options: 'i' } },
                    { shortCode: { $regex: search, $options: 'i' } }
                ];
            }

            const total = await Url.countDocuments(query);
            const userLinks = await Url.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize);

            const [aggregate] = await Url.aggregate([
                { $match: { userId: decodedToken.uid } },
                { $group: { _id: null, totalClicks: { $sum: '$clickCount' }, topClicks: { $max: '$clickCount' } } }
            ]);

            res.status(200).json({
                links: userLinks,
                page,
                pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / pageSize)),
                accountTotalClicks: (aggregate && aggregate.totalClicks) || 0,
                accountTopClicks: (aggregate && aggregate.topClicks) || 0
            });

        } catch (error) {
            console.error('Get links error:', error);
            res.status(500).json({ error: 'An error occurred while fetching your links.' });
        }
    } else if (req.method === 'DELETE') {
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

            const { shortCode } = req.query;
            if (!shortCode) {
                return res.status(400).json({ error: 'shortCode is required' });
            }

            await connectToDatabase();

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
    } else {
        res.setHeader('Allow', ['GET', 'DELETE']);
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};