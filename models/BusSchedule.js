const mongoose = require('mongoose');

const busScheduleSchema = new mongoose.Schema({
  bus_id: {
    type: String,
    required: true,
    unique: true
  },
  route_name: String,
  trips: [{
    trip_name: String,
    direction: String,
    route: String,
    boarding_start_time: String,
    departure_time: String,
    estimated_arrival_time: String,
    active: {
      type: Boolean,
      default: true
    }
  }],
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'bus_schedules' });

module.exports = mongoose.model('BusSchedule', busScheduleSchema);
