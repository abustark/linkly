const test = require('node:test');
const assert = require('node:assert');

function stub(modulePath, exports) {
    const resolved = require.resolve(modulePath);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

stub('../api/_utils/database', async () => ({}));

const updateCalls = [];
let foundUrl = { _id: 'abc', originalUrl: 'https://example.com' };
function Url() {}
Url.findOne = async () => foundUrl;
Url.updateOne = async (filter, update) => { updateCalls.push({ filter, update }); return {}; };
stub('../api/_models/Url', Url);

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
});

test('redirects with 302 and increments click count atomically', async () => {
    const res = makeRes();
    await redirect({ method: 'GET', query: { shortCode: 'river' } }, res);
    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.body, 'https://example.com');
    assert.strictEqual(updateCalls.length, 1);
    const day = new Date().toISOString().slice(0, 10);
    assert.deepStrictEqual(updateCalls[0].update, { $inc: { clickCount: 1, [`clicksByDay.${day}`]: 1 } });
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
