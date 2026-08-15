const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        await connectToDatabase();

        const { shortCode } = req.query;

        const url = await Url.findOne({ shortCode: shortCode });

        if (!url) {
            return res.status(404).json({ error: 'Short URL not found' });
        }

        await Url.updateOne({ _id: url._id }, { $inc: { clickCount: 1 } });

        // 302 (not 301) so browsers don't cache the redirect and click counts stay accurate.
        res.redirect(302, url.originalUrl);

    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).json({ error: 'Error redirecting URL' });
    }
};
