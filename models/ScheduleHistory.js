const mongoose = require('mongoose');

// This model stores a snapshot of the schedule for each date
// When a schedule is saved, we also save a history record for that date
const scheduleHistorySchema = new mongoose.Schema({
    bus_id: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: String, // Format: 'YYYY-MM-DD'
        required: true,
        index: true
    },
    route_name: String,
    trips: [{
        trip_name: String,
        direction: String,
        route: String,
        route_id: String,
        boarding_start_time: String,
        departure_time: String,
        estimated_arrival_time: String,
        active: {
            type: Boolean,
            default: true
        }
    }],
    created_at: {
        type: Date,
        default: Date.now
    }
}, { collection: 'schedule_history' });

// Compound index to ensure one record per bus per date
scheduleHistorySchema.index({ bus_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ScheduleHistory', scheduleHistorySchema);
