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

function generateShortCode() {
    const word = pickWord();
    // ~10% of the time add a numeric suffix up front to spread collisions;
    // the uniqueness check in shorten.js will append a suffix if still taken.
    if (Math.random() < 0.25) {
        return `${word}${randomSuffix()}`;
    }
    return word;
}

module.exports = { generateShortCode, WORDS };
