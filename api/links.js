const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const Click = require('./_models/Click');
const admin = require('./_utils/firebase');

const CSV_MAX_ROWS = 10000;

// CSV cell with RFC 4180 quoting plus a formula-injection guard (a leading
// =, +, -, @, tab or CR can execute in spreadsheet apps).
function csvCell(value) {
    let s = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    if (/["\r\n,]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
}

async function verify(req, res) {
    const { authorization } = req.headers || {};
    if (!authorization || !authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
        return null;
    }
    try {
        return await admin.auth().verifyIdToken(authorization.split('Bearer ')[1]);
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
        return null;
    }
}

function trafficFacet(field) {
    return [
        { $group: { _id: field, c: { $sum: 1 } } },
        { $sort: { c: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, k: { $ifNull: ['$_id', 'Unknown'] }, c: 1 } }
    ];
}

async function trafficBreakdown(userId) {
    try {
        const [result] = await Click.aggregate([
            { $match: { userId } },
            {
                $facet: {
                    referrers: trafficFacet('$referrer'),
                    devices: trafficFacet('$device'),
                    countries: trafficFacet('$country')
                }
            }
        ]);
        return {
            referrers: (result && result.referrers) || [],
            devices: (result && result.devices) || [],
            countries: (result && result.countries) || []
        };
    } catch (error) {
        console.error('Traffic breakdown error:', error);
        return { referrers: [], devices: [], countries: [] };
    }
}

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        try {
            const decodedToken = await verify(req, res);
            if (!decodedToken) return;

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
                // Escape regex metacharacters so the term is matched literally.
                const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                query.$or = [
                    { originalUrl: { $regex: safeSearch, $options: 'i' } },
                    { shortCode: { $regex: safeSearch, $options: 'i' } }
                ];
            }

            // CSV export: every row the current filters match (capped), no pagination.
            if (String(req.query.format || '').toLowerCase() === 'csv') {
                const rows = await Url.find(query)
                    .sort({ createdAt: -1 })
                    .skip(0)
                    .limit(CSV_MAX_ROWS);
                const proto = req.headers['x-forwarded-proto'] || 'http';
                const host = req.headers['x-forwarded-host'] || req.headers.host || '';
                const lines = ['shortCode,shortUrl,originalUrl,clickCount,createdAt,expiresAt'];
                rows.forEach((row) => {
                    lines.push([
                        row.shortCode,
                        `${proto}://${host}/${row.shortCode}`,
                        row.originalUrl,
                        row.clickCount || 0,
                        new Date(row.createdAt).toISOString(),
                        row.expiresAt ? new Date(row.expiresAt).toISOString() : ''
                    ].map(csvCell).join(','));
                });
                res.status(200);
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="linkly-links-${new Date().toISOString().slice(0, 10)}.csv"`);
                return res.end(lines.join('\r\n'));
            }

            const total = await Url.countDocuments(query);
            const userLinks = await Url.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize);

            // Account totals + a 30-day daily-click time series in one round trip.
            const cutoffDay = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
            const [aggregate] = await Url.aggregate([
                { $match: { userId: decodedToken.uid } },
                {
                    $facet: {
                        totals: [
                            { $group: { _id: null, totalClicks: { $sum: '$clickCount' }, topClicks: { $max: '$clickCount' } } }
                        ],
                        series: [
                            { $project: { days: { $objectToArray: { $ifNull: ['$clicksByDay', {}] } } } },
                            { $unwind: '$days' },
                            { $match: { 'days.k': { $gte: cutoffDay } } },
                            { $group: { _id: '$days.k', dayClicks: { $sum: '$days.v' } } },
                            { $sort: { _id: 1 } }
                        ]
                    }
                }
            ]);

            const totals = (aggregate && aggregate.totals && aggregate.totals[0]) || {};
            const byDay = new Map(((aggregate && aggregate.series) || []).map((s) => [s._id, s.dayClicks]));
            const clicksByDay = [];
            for (let i = 29; i >= 0; i--) {
                const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
                clicksByDay.push({ d: day, c: byDay.get(day) || 0 });
            }

            const traffic = await trafficBreakdown(decodedToken.uid);

            res.status(200).json({
                links: userLinks,
                page,
                pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / pageSize)),
                accountTotalClicks: totals.totalClicks || 0,
                accountTopClicks: totals.topClicks || 0,
                clicksByDay,
                traffic
            });

        } catch (error) {
            console.error('Get links error:', error);
            res.status(500).json({ error: 'An error occurred while fetching your links.' });
        }
    } else if (req.method === 'PATCH') {
        try {
            const decodedToken = await verify(req, res);
            if (!decodedToken) return;

            const { shortCode } = req.query;
            if (!shortCode) {
                return res.status(400).json({ error: 'shortCode is required' });
            }

            const { originalUrl } = req.body || {};
            if (!originalUrl || typeof originalUrl !== 'string') {
                return res.status(400).json({ error: 'originalUrl is required' });
            }

            const trimmedUrl = originalUrl.trim();
            let parsedUrl;
            try {
                parsedUrl = new URL(trimmedUrl);
            } catch (error) {
                return res.status(400).json({ error: 'Invalid URL format' });
            }
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return res.status(400).json({ error: 'Only http and https URLs are allowed.' });
            }

            await connectToDatabase();

            const url = await Url.findOne({ shortCode });
            if (!url) {
                return res.status(404).json({ error: 'Short URL not found' });
            }

            if (url.userId !== decodedToken.uid) {
                return res.status(403).json({ error: 'You do not have permission to edit this link.' });
            }

            await Url.updateOne({ _id: url._id }, { $set: { originalUrl: trimmedUrl } });

            res.status(200).json({ success: true, shortCode: url.shortCode, originalUrl: trimmedUrl });
        } catch (error) {
            console.error('Update link error:', error);
            res.status(500).json({ error: 'An error occurred while updating the link.' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const decodedToken = await verify(req, res);
            if (!decodedToken) return;

            const { shortCode } = req.query;
            if (!shortCode) {
                return res.status(400).json({ error: 'shortCode is required' });
            }

            await connectToDatabase();

            const url = await Url.findOne({ shortCode: shortCode });
            if (!url) {
                return res.status(404).json({ error: 'Short URL not found' });
            }

            if (url.userId !== decodedToken.uid) {
                return res.status(403).json({ error: 'You do not have permission to delete this link.' });
            }

            await Url.deleteOne({ _id: url._id });
            try {
                await Click.deleteMany({ shortCode: url.shortCode });
            } catch (clickError) {
                console.error('Click cleanup error:', clickError);
            }

            res.status(200).json({ success: true, shortCode: url.shortCode });
        } catch (error) {
            console.error('Delete link error:', error);
            res.status(500).json({ error: 'An error occurred while deleting the link.' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};
