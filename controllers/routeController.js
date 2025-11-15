const mongoose = require('mongoose');
const Passenger = require('../models/Passenger');
const axios = require('axios');

// Helper to get flexible model
const getModel = (modelName, collectionName) => {
  try {
    return mongoose.model(modelName);
  } catch (error) {
    return mongoose.model(modelName, new mongoose.Schema({}, { strict: false }), collectionName);
  }
};

// @desc    Calculate route distance using OSRM
// @route   GET /api/route-distance
// @access  Private
const calculateRouteDistance = async (req, res) => {
  try {
    const { date, trip_id, bus_id } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const dateStr = date.substring(0, 10);
    const passengers = await Passenger.find({
      entry_timestamp: {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lt: new Date(dateStr + 'T23:59:59.999Z')
      }
    }).sort({ entry_timestamp: 1 });

    let filteredPassengers = passengers;
    if (trip_id && trip_id !== 'ALL') {
      filteredPassengers = passengers.filter(p => p.trip_id === trip_id);
    }

    if (bus_id) {
      filteredPassengers = filteredPassengers.filter(p => p.bus_id === bus_id);
    }

    if (filteredPassengers.length === 0) {
      return res.json({ distance_km: 0, success: false, message: 'No passengers found' });
    }

    const firstPassenger = filteredPassengers[0];
    const lastPassenger = filteredPassengers[filteredPassengers.length - 1];

    const startLat = firstPassenger.entryLocation?.latitude;
    const startLon = firstPassenger.entryLocation?.longitude;
    const endLat = lastPassenger.exitLocation?.latitude;
    const endLon = lastPassenger.exitLocation?.longitude;

    if (!startLat || !startLon || !endLat || !endLon) {
      return res.json({ distance_km: 0, success: false, message: 'Missing GPS coordinates' });
    }

    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}`;
    
    const response = await axios.get(osrmUrl, {
      params: { overview: 'false' },
      timeout: 5000
    });

    if (response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(2);
      const durationMin = (route.duration / 60).toFixed(1);

      return res.json({
        distance_km: parseFloat(distanceKm),
        duration_minutes: parseFloat(durationMin),
        provider: 'osrm',
        success: true,
        start: { lat: startLat, lon: startLon },
        end: { lat: endLat, lon: endLon }
      });
    }

    res.json({ distance_km: 0, success: false, message: 'OSRM API error' });
  } catch (error) {
    console.error('Error calculating route distance:', error);
    res.status(500).json({ 
      distance_km: 0, 
      success: false, 
      error: error.message 
    });
  }
};

// @desc    Create route
// @route   POST /api/routes
// @access  Private
const createRoute = async (req, res) => {
  try {
    const Route = getModel('Route', 'routes');
    const route = new Route(req.body);
    await route.save();
    res.status(201).json({ success: true, route });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private
const updateRoute = async (req, res) => {
  try {
    const Route = getModel('Route', 'routes');
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json({ success: true, route });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private
const deleteRoute = async (req, res) => {
  try {
    const Route = getModel('Route', 'routes');
    const route = await Route.findByIdAndDelete(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json({ success: true, message: 'Route deleted' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  calculateRouteDistance,
  createRoute,
  updateRoute,
  deleteRoute
};
