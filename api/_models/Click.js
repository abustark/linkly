const mongoose = require('mongoose');

// One document per redirect: powers the dashboard's referrer/device/country
// breakdowns. TTL keeps the collection bounded (90 days of click history).
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
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 90 * 86400
    }
});

module.exports = mongoose.model('Click', clickSchema);
