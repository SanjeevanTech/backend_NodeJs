const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  id: String,
  bus_id: String,
  route_name: String,
  trip_id: String,
  entryLocation: {
    latitude: Number,
    longitude: Number,
    device_id: String,
    timestamp: String
  },
  exitLocation: {
    latitude: Number,
    longitude: Number,
    device_id: String,
    timestamp: String
  },
  entry_timestamp: Date,
  exit_timestamp: Date,
  journey_duration_minutes: Number,
  similarity_score: Number,
  entry_face_id: Number,
  exit_face_id: Number,
  distance_info: {
    distance_km: Number,
    duration_minutes: Number,
    provider: String,
    success: Boolean,
    note: String
  },
  price: Number,
  stage_number: Number,
  is_season_ticket: Boolean,
  created_at: Date
}, { collection: 'busPassengerList' });

// Indexes for performance
passengerSchema.index({ entry_timestamp: -1 });
passengerSchema.index({ bus_id: 1, entry_timestamp: -1 });
passengerSchema.index({ trip_id: 1, entry_timestamp: -1 });
passengerSchema.index({ created_at: -1 });

module.exports = mongoose.model('Passenger', passengerSchema);
