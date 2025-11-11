const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  order: {
    type: Number,
    required: true
  }
}, { _id: false });

const waypointGroupSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
    unique: true
  },
  group_name: {
    type: String,
    required: true
  },
  
  // Optional region/area this group covers
  region: {
    type: String,
    required: false
  },
  
  waypoints: [waypointSchema],
  
  is_active: {
    type: Boolean,
    default: true
  },
  
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'waypointGroups' });

// Note: group_id index already created by unique: true
waypointGroupSchema.index({ region: 1, is_active: 1 });

module.exports = mongoose.model('WaypointGroup', waypointGroupSchema);
