const mongoose = require('mongoose');

const unmatchedPassengerSchema = new mongoose.Schema({
  bus_id: String,
  route_name: String,
  type: {
    type: String,
    enum: ['ENTRY', 'EXIT'],
    required: true
  },
  face_id: Number,
  face_embedding: [Number],
  embedding_size: Number,
  location: {
    latitude: Number,
    longitude: Number,
    device_id: String,
    timestamp: String,
    location_name: String
  },
  timestamp: Date,
  best_similarity_found: Number,
  reason: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'unmatchedPassengers' });

module.exports = mongoose.model('UnmatchedPassenger', unmatchedPassengerSchema);
