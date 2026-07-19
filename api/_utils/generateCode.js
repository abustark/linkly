// Generate a random, fixed-length, URL-safe short code.
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

function generateShortCode() {
    let code = '';
    const bytes = new Uint8Array(CODE_LENGTH);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
        for (let i = 0; i < CODE_LENGTH; i += 1) {
            code += ALPHABET[bytes[i] % ALPHABET.length];
        }
    } else {
        for (let i = 0; i < CODE_LENGTH; i += 1) {
            code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        }
    }
    return code;
}

module.exports = { generateShortCode, CODE_LENGTH };
