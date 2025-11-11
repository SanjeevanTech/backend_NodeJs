const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  stop_name: {
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
  stop_order: {
    type: Number,
    required: true
  },
  distance_from_start_km: {
    type: Number,
    default: 0
  }
}, { _id: false });

const busRouteSchema = new mongoose.Schema({
  route_id: {
    type: String,
    required: true,
    unique: true
  },
  route_name: {
    type: String,
    required: true
  },
  description: String,
  
  // NEW: Reference to waypoint groups (preferred method)
  waypoint_groups: [{
    group_id: String,
    order: Number  // Order in which groups are combined
  }],
  
  // OLD: Direct stops (for backward compatibility)
  stops: [stopSchema],
  
  total_distance_km: {
    type: Number,
    default: 0
  },
  estimated_duration_hours: {
    type: Number,
    default: 0
  },
  
  // Which buses use this route
  assigned_buses: [{
    type: String  // bus_id like "BUS_JC_001"
  }],
  
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
}, { collection: 'busRoutes' });

// Index for fast lookups
// Note: route_id index already created by unique: true
busRouteSchema.index({ is_active: 1 });
busRouteSchema.index({ 'stops.latitude': 1, 'stops.longitude': 1 });

module.exports = mongoose.model('BusRoute', busRouteSchema);
