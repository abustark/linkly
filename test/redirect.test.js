const test = require('node:test');
const assert = require('node:assert');

function stub(modulePath, exports) {
    const resolved = require.resolve(modulePath);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

stub('../api/_utils/database', async () => ({}));

const updateCalls = [];
const clickCalls = [];
let foundUrl = { _id: 'abc', shortCode: 'river', originalUrl: 'https://example.com', userId: 'u1', expiresAt: null };
function Url() {}
Url.findOne = async () => foundUrl;
Url.updateOne = async (filter, update) => { updateCalls.push({ filter, update }); return {}; };
stub('../api/_models/Url', Url);

function Click() {}
Click.create = async (doc) => { clickCalls.push(doc); return doc; };
stub('../api/_models/Click', Click);

const redirect = require('../api/redirect');

function makeRes() {
    const res = { statusCode: null, body: null, headers: {} };
    res.redirect = (code, url) => { res.statusCode = code; res.body = url; };
    res.status = (code) => ({ json: (payload) => { res.statusCode = code; res.body = payload; } });
    res.setHeader = (key, value) => { res.headers[key] = value; };
    res.send = (payload) => { res.body = payload; };
    return res;
}

test.beforeEach(() => {
    updateCalls.length = 0;
    clickCalls.length = 0;
    foundUrl = { _id: 'abc', shortCode: 'river', originalUrl: 'https://example.com', userId: 'u1', expiresAt: null };
});

test('redirects with 302 and increments click count atomically', async () => {
    const res = makeRes();
    await redirect({ method: 'GET', query: { shortCode: 'river' } }, res);
    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.body, 'https://example.com');
    assert.strictEqual(updateCalls.length, 1);
    const day = new Date().toISOString().slice(0, 10);
    assert.deepStrictEqual(updateCalls[0].update, { $inc: { clickCount: 1, [`clicksByDay.${day}`]: 1 } });
    assert.strictEqual(clickCalls.length, 1);
    assert.strictEqual(clickCalls[0].shortCode, 'river');
    assert.strictEqual(clickCalls[0].userId, 'u1');
    assert.strictEqual(clickCalls[0].referrer, 'Direct');
    assert.strictEqual(clickCalls[0].device, 'Desktop');
    assert.strictEqual(clickCalls[0].country, 'Unknown');
});

test('records referrer, device and country from request headers', async () => {
    const res = makeRes();
    await redirect({
        method: 'GET',
        query: { shortCode: 'river' },
        headers: {
            referer: 'https://www.google.com/search?q=linkly',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
            'x-vercel-ip-country': 'in'
        }
    }, res);
    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(clickCalls[0].referrer, 'google.com');
    assert.strictEqual(clickCalls[0].device, 'Mobile');
    assert.strictEqual(clickCalls[0].country, 'IN');
});

test('returns 410 for an expired link without counting a click', async () => {
    foundUrl = { _id: 'old', originalUrl: 'https://example.com', userId: 'u1', expiresAt: new Date(Date.now() - 1000) };
    const res = makeRes();
    await redirect({ method: 'GET', query: { shortCode: 'old' }, headers: { accept: 'application/json' } }, res);
    assert.strictEqual(res.statusCode, 410);
    assert.deepStrictEqual(res.body, { error: 'Short URL has expired' });
    assert.strictEqual(updateCalls.length, 0);
    assert.strictEqual(clickCalls.length, 0);
});

test('serves a branded expired page for browser requests', async () => {
    foundUrl = { _id: 'old', originalUrl: 'https://example.com', userId: 'u1', expiresAt: new Date(Date.now() - 1000) };
    const res = makeRes();
    await redirect({ method: 'GET', query: { shortCode: 'old' }, headers: { accept: 'text/html' } }, res);
    assert.strictEqual(res.statusCode, 410);
    assert.match(res.headers['Content-Type'], /text\/html/);
    assert.ok(res.body.includes('This link has expired'));
});

test('returns 404 for an unknown short code', async () => {
    foundUrl = null;
    const res = makeRes();
    await redirect({ method: 'GET', query: { shortCode: 'nope' } }, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(updateCalls.length, 0);
});

test('serves a branded HTML 404 page for browser requests', async () => {
    foundUrl = null;
    const res = makeRes();
    await redirect({
        method: 'GET',
        query: { shortCode: 'nope' },
        headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
    }, res);
    assert.strictEqual(res.statusCode, 404);
    assert.match(res.headers['Content-Type'], /text\/html/);
    assert.ok(res.body.includes('Link not found'));
    assert.ok(res.body.includes('/nope'));
});

test('returns JSON 404 for non-browser clients', async () => {
    foundUrl = null;
    const res = makeRes();
    await redirect({
        method: 'GET',
        query: { shortCode: 'nope' },
        headers: { accept: 'application/json' }
    }, res);
    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { error: 'Short URL not found' });
});
