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

let savedDocs = [];
function Url(data) {
    Object.assign(this, data);
}
Url.findOne = async (query) => {
    if (query && query.shortCode === 'taken') return { shortCode: 'taken' };
    return null;
};
Url.prototype.save = async function save() {
    savedDocs.push(this);
    return this;
};
stub('../api/_models/Url', Url);

const shorten = require('../api/shorten');

function makeReq(body) {
    return {
        method: 'POST',
        headers: {
            'x-forwarded-proto': 'https',
            'x-forwarded-host': 'linkly-link.vercel.app'
        },
        body
    };
}

function makeRes() {
    const res = { statusCode: null, body: null };
    res.status = (code) => ({ json: (payload) => { res.statusCode = code; res.body = payload; } });
    return res;
}

test.beforeEach(() => {
    savedDocs = [];
});

test('rejects non-http(s) URL schemes', async () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://files.example.com/x']) {
        const res = makeRes();
        await shorten(makeReq({ originalUrl: url }), res);
        assert.strictEqual(res.statusCode, 400, `${url} should be rejected`);
    }
});

test('rejects malformed custom aliases', async () => {
    const invalidAliases = ['ab', 'x'.repeat(13), 'bad alias!', 'my.alias', 'my/alias'];
    for (const alias of invalidAliases) {
        const res = makeRes();
        await shorten(makeReq({ originalUrl: 'https://example.com', customAlias: alias }), res);
        assert.strictEqual(res.statusCode, 400, `alias "${alias}" should be rejected`);
    }
});

test('accepts a valid custom alias', async () => {
    const res = makeRes();
    await shorten(makeReq({ originalUrl: 'https://example.com', customAlias: 'my-campaign' }), res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.shortUrl, 'https://linkly-link.vercel.app/my-campaign');
    assert.strictEqual(savedDocs.length, 1);
    assert.strictEqual(savedDocs[0].shortCode, 'my-campaign');
});

test('returns 409 when the custom alias is already taken', async () => {
    const res = makeRes();
    await shorten(makeReq({ originalUrl: 'https://example.com', customAlias: 'taken' }), res);
    assert.strictEqual(res.statusCode, 409);
});

test('auto-generates a code when no alias is provided', async () => {
    const res = makeRes();
    await shorten(makeReq({ originalUrl: 'https://example.com' }), res);
    assert.strictEqual(res.statusCode, 201);
    assert.match(res.body.shortUrl, /^https:\/\/linkly-link\.vercel\.app\/[a-zA-Z0-9_-]{3,12}$/);
});
