const test = require('node:test');
const assert = require('node:assert');

const WORDS = require('../api/_utils/words');
const { generateShortCode } = require('../api/_utils/generateCode');

test('word list has no duplicates', () => {
    assert.strictEqual(new Set(WORDS).size, WORDS.length);
});

test('all words are 3-12 characters so they match the Vercel rewrite', () => {
    for (const word of WORDS) {
        assert.ok(word.length >= 3 && word.length <= 12, `word "${word}" length ${word.length} is outside 3-12`);
    }
});

test('generated codes always match the Vercel rewrite pattern', () => {
    const pattern = new RegExp('^[a-zA-Z0-9_-]{3,12}$');
    for (let i = 0; i < 500; i += 1) {
        const code = generateShortCode();
        assert.match(code, pattern, `code "${code}" does not match the rewrite pattern`);
    }
});

test('rewrite pattern accepts short (3 char) and long (12 char) codes but not outside bounds', () => {
    const shortCodeRewrite = require('../vercel.json').rewrites.find((r) => r.source.includes(':shortCode'));
    assert.ok(shortCodeRewrite, 'expected a short-code rewrite in vercel.json');
    const match = shortCodeRewrite.source.match(/\[([^\]]+)\]/);
    assert.ok(match, 'expected a character class in the rewrite source');
    const pattern = new RegExp(`^[${match[1]}]{3,12}$`);
    assert.match('sky', pattern);
    assert.match('sunflower12', pattern);
    assert.doesNotMatch('sk', pattern);
    assert.doesNotMatch('abcdefghijklm', pattern);
});
