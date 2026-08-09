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
    const res = { statusCode: null, body: null };
    res.redirect = (code, url) => { res.statusCode = code; res.body = url; };
    res.status = (code) => ({ json: (payload) => { res.statusCode = code; res.body = payload; } });
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
    assert.deepStrictEqual(updateCalls[0].update, { $inc: { clickCount: 1 } });
});

test('returns 404 for an unknown short code', async () => {
    foundUrl = null;
    const res = makeRes();
    await redirect({ method: 'GET', query: { shortCode: 'nope' } }, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(updateCalls.length, 0);
});
