// Generate a random 6-character short code
function generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
}

module.exports = { generateShortCode };