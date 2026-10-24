const mongoose = require('mongoose');

// One document per redirect: powers the dashboard's referrer/device/country,
// browser/OS and UTM breakdowns. TTL keeps the collection bounded (90 days of
// click history).
const clickSchema = new mongoose.Schema({
    shortCode: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: false,
        index: true
    },
    referrer: {
        type: String,
        default: 'Direct'
    },
    device: {
        type: String,
        default: 'Desktop'
    },
    country: {
        type: String,
        default: 'Unknown'
    },
    browser: {
        type: String,
        default: 'Other'
    },
    os: {
        type: String,
        default: 'Other'
    },
    // Salted, rotating hash (never the raw IP/user-agent) used only to estimate
    // unique visitors. Null when VISITOR_HASH_SECRET is not configured.
    visitorHash: {
        type: String,
        default: null
    },
    utmSource: {
        type: String,
        default: 'None'
    },
    utmMedium: {
        type: String,
        default: 'None'
    },
    utmCampaign: {
        type: String,
        default: 'None'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 90 * 86400
    }
});

clickSchema.index({ userId: 1, visitorHash: 1 });

module.exports = mongoose.model('Click', clickSchema);
