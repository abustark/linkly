const connectToDatabase = require('./_utils/database');
const { generateShortCode } = require('./_utils/generateCode');
const Url = require('./_models/Url');
const admin = require('./_utils/firebase');

module.exports = async (req, res) => {
    const { originalUrl, customAlias } = req.body;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        if (!originalUrl) {
            return res.status(400).json({ error: 'originalUrl is required' });
        }

        let userId = null;
        const { authorization } = req.headers;

        if (authorization && authorization.startsWith('Bearer ')) {
            const idToken = authorization.split('Bearer ')[1];
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (error) {
                console.log('Invalid or expired token. Proceeding as anonymous.');
            }
        }

        await connectToDatabase();

        const trimmedUrl = originalUrl.trim();
        new URL(trimmedUrl);

        let shortCode = customAlias;
        if (shortCode) {
            const existing = await Url.findOne({ shortCode: shortCode });
            if (existing) {
                return res.status(409).json({ error: 'This custom alias is already in use.' });
            }
        } else {
            shortCode = generateShortCode();
        }
        
        const newUrlData = {
            originalUrl: trimmedUrl,
            shortCode: shortCode,
            userId: userId // Add the user's ID if they are authenticated
        };

        const newUrl = new Url(newUrlData);
        await newUrl.save();

        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        
        const shortUrl = `${protocol}://${host}/${newUrl.shortCode}`;

        res.status(201).json({
            originalUrl: newUrl.originalUrl,
            shortUrl: shortUrl,
            ownedByUser: !!newUrl.userId
        });

    } catch (error) {
        if (error.message.includes('Invalid URL')) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        console.error('Shorten error:', error);
        res.status(500).json({ error: 'Error creating short URL' });
    }
};