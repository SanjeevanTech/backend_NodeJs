const mongoose = require('mongoose');

const tripSessionSchema = new mongoose.Schema({
    trip_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    bus_id: {
        type: String,
        required: true,
        index: true
    },
    route_name: {
        type: String,
        required: true
    },
    start_time: {
        type: Date,
        required: true,
        index: true
    },
    end_time: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'completed_auto_cleanup'],
        default: 'active'
    },
    total_passengers: {
        type: Number,
        default: 0
    },
    total_unmatched: {
        type: Number,
        default: 0
    },
    route_detection_gps: {
        latitude: Number,
        longitude: Number
    },
    note: String,
    created_at: {
        type: Date,
        default: Date.now
    }
}, { collection: 'tripSessions' });

module.exports = mongoose.model('TripSession', tripSessionSchema);
