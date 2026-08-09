const test = require('node:test');
const assert = require('node:assert');

function stub(modulePath, exports) {
    const resolved = require.resolve(modulePath);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

stub('../api/_utils/database', async () => ({}));

stub('../api/_utils/firebase', {
    auth: () => ({ verifyIdToken: async () => ({ uid: 'user1' }) })
});

let capturedQuery = null;
function Url() {}
Url.find = (query) => {
    capturedQuery = query;
    return { sort: () => ({ skip: () => ({ limit: async () => [] }) }) };
};
Url.countDocuments = async (query) => { capturedQuery = query; return 0; };
Url.aggregate = async () => [{ totalClicks: 42, topClicks: 7 }];
stub('../api/_models/Url', Url);

const links = require('../api/links');

function makeReq(query) {
    return { method: 'GET', headers: { authorization: 'Bearer token' }, query };
}

function makeRes() {
    const res = { statusCode: null, body: null };
    res.status = (code) => ({ json: (payload) => { res.statusCode = code; res.body = payload; } });
    return res;
}

test('GET /api/links returns account-wide aggregates', async () => {
    const res = makeRes();
    await links(makeReq({ page: '1' }), res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.accountTotalClicks, 42);
    assert.strictEqual(res.body.accountTopClicks, 7);
    assert.strictEqual(res.body.total, 0);
});

test('search term builds an $or query', async () => {
    const res = makeRes();
    await links(makeReq({ q: 'foo' }), res);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(capturedQuery.$or, 'expected $or in the query');
});

test('range=7d adds a createdAt filter', async () => {
    const res = makeRes();
    await links(makeReq({ range: '7d' }), res);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(capturedQuery.createdAt && capturedQuery.createdAt.$gte, 'expected a createdAt filter');
});

test('rejects requests without an auth header', async () => {
    const res = makeRes();
    await links({ method: 'GET', headers: {}, query: {} }, res);
    assert.strictEqual(res.statusCode, 401);
});
