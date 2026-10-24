const mongoose = require('mongoose');

// API keys are stored as SHA-256 hashes: the raw key is shown once at creation
// and can never be recovered from the database.
const apiKeySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60
    },
    // Display-only prefix, e.g. "lk_live_ab12cd…". Safe to show in the UI.
    prefix: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true,
        unique: true
    },
    lastUsedAt: {
        type: Date,
        default: null
    },
    revokedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

apiKeySchema.index({ userId: 1, revokedAt: 1, createdAt: -1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
