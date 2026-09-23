const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

// Self-contained branded 404 for browsers hitting a dead short link.
// No scripts and no external assets, so it works under the strict CSP.
function notFoundPage(shortCode) {
    const code = escapeHtml(shortCode || '');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f4f7fb">
<title>Link not found — Linkly</title>
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
    background: linear-gradient(135deg, #2563eb, #4f46e5);
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
    <h1>Link not found</h1>
    <p>The short link <code>/${code}</code> doesn't exist or has been removed.</p>
    <a class="btn" href="/">Create a new link &rarr;</a>
    <footer>Linkly — short, clean links.</footer>
  </main>
</body>
</html>`;
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
            const accept = String((req.headers && req.headers.accept) || '');
            if (accept.includes('text/html')) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(notFoundPage(shortCode));
            }
            return res.status(404).json({ error: 'Short URL not found' });
        }

        // Bucket the click by UTC day for the dashboard's 30-day time series.
        const clickDay = new Date().toISOString().slice(0, 10);
        await Url.updateOne({ _id: url._id }, { $inc: { clickCount: 1, [`clicksByDay.${clickDay}`]: 1 } });

        // 302 (not 301) so browsers don't cache the redirect and click counts stay accurate.
        res.redirect(302, url.originalUrl);

    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).json({ error: 'Error redirecting URL' });
    }
};
