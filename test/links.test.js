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
let deleteTarget = null;
let updateCalls = [];
function Url() {}
Url.find = (query) => {
    capturedQuery = query;
    return { sort: () => ({ skip: () => ({ limit: async () => [] }) }) };
};
Url.countDocuments = async (query) => { capturedQuery = query; return 0; };
Url.aggregate = async () => [{ totals: [{ totalClicks: 42, topClicks: 7 }], series: [] }];
Url.findOne = async () => deleteTarget;
Url.deleteOne = async () => ({ deletedCount: 1 });
Url.updateOne = async (filter, update) => { updateCalls.push({ filter, update }); return { modifiedCount: 1 }; };
stub('../api/_models/Url', Url);

function Click() {}
Click.aggregate = async () => [{
    referrers: [{ k: 'google.com', c: 3 }],
    devices: [{ k: 'Mobile', c: 2 }],
    countries: [{ k: 'US', c: 5 }]
}];
Click.deleteMany = async () => ({ deletedCount: 1 });
stub('../api/_models/Click', Click);

const links = require('../api/links');

function makeReq(query, method = 'GET', body) {
    return { method, headers: { authorization: 'Bearer token' }, query, body };
}

function makeRes() {
    const res = { statusCode: null, body: null };
    res.status = (code) => ({ json: (payload) => { res.statusCode = code; res.body = payload; } });
    return res;
}

test.beforeEach(() => {
    updateCalls = [];
    deleteTarget = null;
});

test('GET /api/links returns account-wide aggregates', async () => {
    const res = makeRes();
    await links(makeReq({ page: '1' }), res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.accountTotalClicks, 42);
    assert.strictEqual(res.body.accountTopClicks, 7);
    assert.strictEqual(res.body.total, 0);
    assert.deepStrictEqual(res.body.traffic, {
        referrers: [{ k: 'google.com', c: 3 }],
        devices: [{ k: 'Mobile', c: 2 }],
        countries: [{ k: 'US', c: 5 }]
    });
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

test('search with regex metacharacters is escaped', async () => {
    const res = makeRes();
    await links(makeReq({ q: 'a(b|c)123' }), res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(capturedQuery.$or[0].originalUrl.$regex, 'a\\(b\\|c\\)123');
});

test('DELETE removes a link owned by the caller', async () => {
    deleteTarget = { _id: 'id1', shortCode: 'mine', userId: 'user1' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'mine' }, 'DELETE'), res);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { success: true, shortCode: 'mine' });
});

test('DELETE rejects a link owned by another user', async () => {
    deleteTarget = { _id: 'id2', shortCode: 'theirs', userId: 'user2' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'theirs' }, 'DELETE'), res);
    assert.strictEqual(res.statusCode, 403);
});

test('DELETE rejects an ownerless legacy link (fail closed)', async () => {
    deleteTarget = { _id: 'id3', shortCode: 'orphan' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'orphan' }, 'DELETE'), res);
    assert.strictEqual(res.statusCode, 403);
});

test('DELETE returns 404 for an unknown short code', async () => {
    deleteTarget = null;
    const res = makeRes();
    await links(makeReq({ shortCode: 'ghost' }, 'DELETE'), res);
    assert.strictEqual(res.statusCode, 404);
});

test('PATCH updates the destination of a link owned by the caller', async () => {
    deleteTarget = { _id: 'id4', shortCode: 'mine', userId: 'user1', originalUrl: 'https://old.example.com' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'mine' }, 'PATCH', { originalUrl: 'https://new.example.com' }), res);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, { success: true, shortCode: 'mine', originalUrl: 'https://new.example.com' });
    assert.strictEqual(updateCalls.length, 1);
    assert.deepStrictEqual(updateCalls[0].update, { $set: { originalUrl: 'https://new.example.com' } });
});

test('PATCH rejects a link owned by another user', async () => {
    deleteTarget = { _id: 'id5', shortCode: 'theirs', userId: 'user2' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'theirs' }, 'PATCH', { originalUrl: 'https://evil.example.com' }), res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(updateCalls.length, 0);
});

test('PATCH rejects an ownerless legacy link (fail closed)', async () => {
    deleteTarget = { _id: 'id6', shortCode: 'orphan' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'orphan' }, 'PATCH', { originalUrl: 'https://example.com' }), res);
    assert.strictEqual(res.statusCode, 403);
});

test('PATCH rejects non-http(s) destinations', async () => {
    deleteTarget = { _id: 'id7', shortCode: 'mine', userId: 'user1' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'mine' }, 'PATCH', { originalUrl: 'javascript:alert(1)' }), res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(updateCalls.length, 0);
});

test('PATCH rejects a malformed URL', async () => {
    deleteTarget = { _id: 'id8', shortCode: 'mine', userId: 'user1' };
    const res = makeRes();
    await links(makeReq({ shortCode: 'mine' }, 'PATCH', { originalUrl: 'not a url' }), res);
    assert.strictEqual(res.statusCode, 400);
});

test('PATCH returns 404 for an unknown short code', async () => {
    deleteTarget = null;
    const res = makeRes();
    await links(makeReq({ shortCode: 'ghost' }, 'PATCH', { originalUrl: 'https://example.com' }), res);
    assert.strictEqual(res.statusCode, 404);
});

test('PATCH requires authentication', async () => {
    const res = makeRes();
    await links({ method: 'PATCH', headers: {}, query: { shortCode: 'mine' }, body: { originalUrl: 'https://example.com' } }, res);
    assert.strictEqual(res.statusCode, 401);
});
