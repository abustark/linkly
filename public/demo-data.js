// Sample workspace used by /dashboard.html?demo=1. Nothing here touches the
// database: the dashboard renders it entirely in the browser and disables
// every write action, so reviewers can explore the product without signing in.

const NOW = Date.now();
const DAY = 86400000;

function daysAgo(days) {
    return new Date(NOW - days * DAY).toISOString();
}

function dayKey(daysAgoCount) {
    return new Date(NOW - daysAgoCount * DAY).toISOString().slice(0, 10);
}

const SERIES = [
    96, 112, 105, 128, 141, 120, 98,
    150, 168, 155, 172, 190, 176, 149,
    205, 221, 198, 234, 256, 240, 212,
    268, 291, 275, 310, 334, 318, 289,
    352, 376
];

const clicksByDay = SERIES.map((c, index) => ({
    d: dayKey(29 - index),
    c
}));

const links = [
    { shortCode: 'launch', originalUrl: 'https://acme.studio/launch/analytics-suite', createdAt: daysAgo(12), clickCount: 2482 },
    { shortCode: 'docs-v2', originalUrl: 'https://docs.acme.studio/v2/getting-started', createdAt: daysAgo(18), clickCount: 1764 },
    { shortCode: 'q4-report', originalUrl: 'https://acme.studio/reports/q4-growth', createdAt: daysAgo(6), clickCount: 1231 },
    { shortCode: 'webinar', originalUrl: 'https://acme.studio/events/scaling-links', createdAt: daysAgo(3), clickCount: 912, expiresAt: new Date(NOW + 6 * DAY).toISOString() },
    { shortCode: 'newsletter', originalUrl: 'https://acme.studio/newsletter/october', createdAt: daysAgo(9), clickCount: 789 },
    { shortCode: 'case-study', originalUrl: 'https://acme.studio/customers/northwind', createdAt: daysAgo(24), clickCount: 576 },
    { shortCode: 'beta-invite', originalUrl: 'https://app.acme.studio/signup?plan=beta', createdAt: daysAgo(2), clickCount: 488, expiresAt: new Date(NOW - 1 * DAY).toISOString() },
    { shortCode: 'portfolio', originalUrl: 'https://abufolio.vercel.app', createdAt: daysAgo(40), clickCount: 354 },
    { shortCode: 'pricing', originalUrl: 'https://acme.studio/pricing', createdAt: daysAgo(14), clickCount: 343 },
    { shortCode: 'careers', originalUrl: 'https://acme.studio/careers', createdAt: daysAgo(27), clickCount: 196 },
    { shortCode: 'status', originalUrl: 'https://status.acme.studio', createdAt: daysAgo(31), clickCount: 161, disabled: true },
    { shortCode: 'api-docs', originalUrl: 'https://docs.acme.studio/api', createdAt: daysAgo(5), clickCount: 147 }
];

const traffic = {
    referrers: [
        { k: 'Direct', c: 1842 },
        { k: 'google.com', c: 1214 },
        { k: 'linkedin.com', c: 986 },
        { k: 'x.com', c: 742 },
        { k: 'newsletter', c: 611 },
        { k: 'github.com', c: 388 }
    ],
    devices: [
        { k: 'Mobile', c: 3612 },
        { k: 'Desktop', c: 2281 },
        { k: 'Tablet', c: 446 }
    ],
    countries: [
        { k: 'US', c: 2214 },
        { k: 'IN', c: 1106 },
        { k: 'GB', c: 842 },
        { k: 'DE', c: 611 },
        { k: 'CA', c: 498 },
        { k: 'AU', c: 367 }
    ],
    browsers: [
        { k: 'Chrome', c: 3102 },
        { k: 'Safari', c: 1488 },
        { k: 'Edge', c: 742 },
        { k: 'Firefox', c: 611 },
        { k: 'Samsung Internet', c: 396 }
    ],
    oses: [
        { k: 'iOS', c: 2046 },
        { k: 'Android', c: 1702 },
        { k: 'Windows', c: 1284 },
        { k: 'macOS', c: 842 },
        { k: 'Linux', c: 465 }
    ],
    utmSources: [
        { k: 'None', c: 2889 },
        { k: 'newsletter', c: 1204 },
        { k: 'linkedin', c: 986 },
        { k: 'x', c: 742 },
        { k: 'producthunt', c: 518 }
    ],
    utmCampaigns: [
        { k: 'None', c: 2633 },
        { k: 'q4-launch', c: 1842 },
        { k: 'docs-v2', c: 964 },
        { k: 'webinar', c: 512 },
        { k: 'beta', c: 388 }
    ],
    uniqueVisitors: 3218
};

export const DEMO = {
    workspace: 'Acme Studio',
    note: 'Sample workspace · read-only',
    links,
    clicksByDay,
    traffic
};
