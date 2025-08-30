const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true,
        trim: true
    },

     userId: {
        type: String, // This will store the Firebase UID
        required: false, // For now, allow anonymous links
    },

    
    shortCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    clickCount: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Url', urlSchema);