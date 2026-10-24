const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const Click = require('./_models/Click');
const crypto = require('crypto');

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

// Self-contained branded status page for browsers hitting a dead short link.
// No scripts and no external assets, so it works under the strict CSP.
function statusPage({ title, heading, message, shortCode }) {
    const code = escapeHtml(shortCode || '');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f4f7fb">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    text-align: center; padding: 24px;
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    background: radial-gradient(900px 480px at 50% -12%, #eaf2fb, transparent 70%), #f4f7fb;
    color: #0f172a;
  }
  .card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 18px;
    padding: 40px 32px; max-width: 440px;
    box-shadow: 0 10px 30px -12px rgba(15, 23, 42, 0.18);
  }
  .logo {
    width: 44px; height: 44px; margin: 0 auto 18px; border-radius: 10px;
    background: #2563eb;
    display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 20px;
  }
  h1 { margin: 0 0 8px; font-family: "Sora", system-ui, sans-serif; font-size: 1.6rem; letter-spacing: -0.02em; }
  p { margin: 0 0 6px; color: #64748b; line-height: 1.6; }
  code { background: #eff4ff; color: #2563eb; padding: 2px 8px; border-radius: 999px; font-size: 0.9em; word-break: break-all; }
  .btn {
    display: inline-block; margin-top: 22px; padding: 12px 22px; border-radius: 10px;
    background: #2563eb; color: #fff; font-weight: 700; text-decoration: none;
  }
  .btn:hover { filter: brightness(1.08); }
  footer { margin-top: 26px; font-size: 0.8rem; color: #94a3b8; }
  footer a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
  footer a:hover { color: #2563eb; }
  @media (prefers-color-scheme: dark) {
    :root { color-scheme: dark; }
    body { background: #0a0f1c; color: #e8edf6; }
    .card { background: #131a2b; border-color: #243049; box-shadow: none; }
    p { color: #93a1bd; }
    code { background: #16223c; color: #60a5fa; }
    footer { color: #64748b; }
  }
</style>
</head>
<body>
  <main class="card">
    <div class="logo" aria-hidden="true">L</div>
    <h1>${heading}</h1>
    <p>${message.replace('{code}', `<code>/${code}</code>`)}</p>
    <a class="btn" href="/">Create a new link &rarr;</a>
    <footer>Linkly — short, clean links. &middot; <a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a></footer>
  </main>
</body>
</html>`;
}

function notFoundPage(shortCode) {
    return statusPage({
        title: 'Link not found — Linkly',
        heading: 'Link not found',
        message: "The short link {code} doesn't exist or has been removed.",
        shortCode
    });
}

function expiredPage(shortCode) {
    return statusPage({
        title: 'Link expired — Linkly',
        heading: 'This link has expired',
        message: 'The short link {code} has reached its expiration date.',
        shortCode
    });
}

function disabledPage(shortCode) {
    return statusPage({
        title: 'Link unavailable — Linkly',
        heading: 'This link is unavailable',
        message: 'The short link {code} has been disabled.',
        shortCode
    });
}

function wantsHtml(req) {
    return String((req.headers && req.headers.accept) || '').includes('text/html');
}

function referrerOf(req) {
    const raw = req.headers && (req.headers.referer || req.headers.referrer);
    if (!raw) return 'Direct';
    try {
        const host = new URL(String(raw)).hostname.replace(/^www\./i, '');
        return (host || 'Direct').slice(0, 80);
    } catch (e) {
        return 'Direct';
    }
}

function deviceOf(req) {
    const ua = String((req.headers && req.headers['user-agent']) || '');
    if (/iPad|Tablet/i.test(ua)) return 'Tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
    return 'Desktop';
}

function countryOf(req) {
    const headers = req.headers || {};
    const raw = String(headers['x-vercel-ip-country'] || headers['cf-ipcountry'] || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(raw) ? raw : 'Unknown';
}

// Coarse browser/OS buckets parsed from the UA on the server. The full
// user-agent string is intentionally never stored.
function browserOf(req) {
    const ua = String((req.headers && req.headers['user-agent']) || '');
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/OPR\/|Opera/i.test(ua)) return 'Opera';
    if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
    if (/Chrome\/|CriOS/i.test(ua)) return 'Chrome';
    if (/Firefox\/|FxiOS/i.test(ua)) return 'Firefox';
    if (/Safari\//i.test(ua)) return 'Safari';
    return 'Other';
}

function osOf(req) {
    const ua = String((req.headers && req.headers['user-agent']) || '');
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Other';
}

function clientIp(req) {
    const realIp = req.headers['x-real-ip'];
    if (realIp) return String(realIp).trim();
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Daily-rotating HMAC: the stored value cannot be reversed to an IP or device
// and changes every UTC day, so it only supports coarse unique-visitor counts.
function visitorHashOf(req) {
    const secret = process.env.VISITOR_HASH_SECRET;
    if (!secret) return null;
    const ua = String((req.headers && req.headers['user-agent']) || '');
    const day = new Date().toISOString().slice(0, 10);
    return crypto
        .createHmac('sha256', secret)
        .update(`${clientIp(req)}|${ua}|${day}`)
        .digest('hex')
        .slice(0, 32);
}

function utmOf(req, key) {
    const raw = req.query && req.query[key];
    const value = String(Array.isArray(raw) ? raw[0] : (raw || ''))
        .replace(/[\u0000-\u001f]/g, '')
        .trim()
        .slice(0, 80);
    return value || 'None';
}

// Crawlers, social previews and uptime checkers should follow the redirect
// but must not pollute the owner's click analytics.
const BOT_UA = /(?:bot\/|bot;|\bbot\b|bot$|crawler|spider|slurp|facebookexternalhit|embedly|quora link preview|pinterest|vkshare|w3c_validator|whatsapp|telegrambot|discordbot|linkedinbot|twitterbot|slackbot|skypeuripreview|google-inspectiontool|bingpreview|headlesschrome|lighthouse|pagespeed|pingdom|uptime|curl\/|wget\/|python-requests|go-http-client|axios\/)/i;

function isBot(req) {
    const ua = String((req.headers && req.headers['user-agent']) || '');
    return BOT_UA.test(ua);
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        await connectToDatabase();

        const { shortCode } = req.query;

        const url = await Url.findOne({ shortCode: shortCode });

        if (!url) {
            if (wantsHtml(req)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(notFoundPage(shortCode));
            }
            return res.status(404).json({ error: 'Short URL not found' });
        }

        if (url.disabled) {
            if (wantsHtml(req)) {
                res.statusCode = 410;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(disabledPage(shortCode));
            }
            return res.status(410).json({ error: 'Short URL has been disabled' });
        }

        if (url.expiresAt && new Date(url.expiresAt).getTime() <= Date.now()) {
            if (wantsHtml(req)) {
                res.statusCode = 410;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(expiredPage(shortCode));
            }
            return res.status(410).json({ error: 'Short URL has expired' });
        }

        // Bots still follow the link, but only humans contribute analytics.
        if (!isBot(req)) {
            // Bucket the click by UTC day for the dashboard's 30-day time series.
            const clickDay = new Date().toISOString().slice(0, 10);
            await Url.updateOne({ _id: url._id }, { $inc: { clickCount: 1, [`clicksByDay.${clickDay}`]: 1 } });

            // Click event for the traffic breakdown. Analytics must never break a redirect.
            try {
                await Click.create({
                    shortCode: url.shortCode,
                    userId: url.userId || null,
                    referrer: referrerOf(req),
                    device: deviceOf(req),
                    country: countryOf(req),
                    browser: browserOf(req),
                    os: osOf(req),
                    visitorHash: visitorHashOf(req),
                    utmSource: utmOf(req, 'utm_source'),
                    utmMedium: utmOf(req, 'utm_medium'),
                    utmCampaign: utmOf(req, 'utm_campaign')
                });
            } catch (clickError) {
                console.error('Click tracking error:', clickError);
            }
        }

        // 302 (not 301) so browsers don't cache the redirect and click counts stay accurate.
        res.redirect(302, url.originalUrl);

    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).json({ error: 'Error redirecting URL' });
    }
};
