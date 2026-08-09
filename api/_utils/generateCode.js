// Generate a human-readable, URL-safe short code from a curated word list.
const WORDS = require('./words');

function pickWord() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint32Array(1);
        crypto.getRandomValues(bytes);
        return WORDS[bytes[0] % WORDS.length];
    }
    return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function randomSuffix() {
    const bytes = new Uint32Array(1);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
        return (bytes[0] % 90) + 10; // 10-99
    }
    return (Math.floor(Math.random() * 90) + 10);
}

const MAX_CODE_LENGTH = 12;

function generateShortCode() {
    const word = pickWord();
    // ~25% of the time add a numeric suffix up front to spread collisions;
    // keep the total within the 12-char limit enforced by the redirect route.
    if (Math.random() < 0.25 && word.length + 2 <= MAX_CODE_LENGTH) {
        return `${word}${randomSuffix()}`;
    }
    return word;
}

module.exports = { generateShortCode, WORDS, MAX_CODE_LENGTH };
