const mongoose = require('mongoose');
const Passenger = require('../models/Passenger');
const BusSchedule = require('../models/BusSchedule'); // Added
const ScheduleHistory = require('../models/ScheduleHistory'); // Added
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

    // Build initial query
    const query = {
      entry_timestamp: { // Default full day query
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lt: new Date(dateStr + 'T23:59:59.999Z')
      }
    };

    if (bus_id && bus_id !== 'ALL') {
      query.bus_id = bus_id;
    }

    if (trip_id && trip_id !== 'ALL') {
      if (trip_id.startsWith('SCHEDULED_')) {
        // Handle scheduled trip ID logic (similar to getPassengers)
        const parts = trip_id.split('_');
        const tripIndex = parseInt(parts[parts.length - 1]);
        const busIdFromTrip = parts.slice(1, -2).join('_');
        const dateFromTrip = parts[parts.length - 2];

        const tripDate = new Date(dateFromTrip);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        tripDate.setHours(0, 0, 0, 0);
        const isHistoricalDate = tripDate < today;

        let scheduledTrip = null;

        if (isHistoricalDate) {
          const scheduleHistory = await ScheduleHistory.findOne({
            bus_id: busIdFromTrip,
            date: dateFromTrip
          });
          if (scheduleHistory && scheduleHistory.trips && scheduleHistory.trips[tripIndex]) {
            scheduledTrip = scheduleHistory.trips[tripIndex];
          }
        } else {
          const schedule = await BusSchedule.findOne({ bus_id: busIdFromTrip });
          if (schedule && schedule.trips && schedule.trips[tripIndex]) {
            scheduledTrip = schedule.trips[tripIndex];
          }
        }

        if (scheduledTrip) {
          const departureTime = scheduledTrip.departure_time || scheduledTrip.boarding_start_time;

          // Construct time window
          const tripDateTimeStr = `${dateFromTrip}T${departureTime}:00.000+05:30`;
          const tripDateTime = new Date(tripDateTimeStr);

          const startWindow = new Date(tripDateTime.getTime() - 3 * 60 * 60 * 1000); // -3 hours
          const endWindow = new Date(tripDateTime.getTime() + 3 * 60 * 60 * 1000);   // +3 hours

          // Override default day query with specific window
          query.entry_timestamp = {
            $gte: startWindow,
            $lte: endWindow
          };

          // Ensure bus_id matches the trip's bus
          if (!query.bus_id) query.bus_id = busIdFromTrip;

        } else {
          console.log("Could not find scheduled trip details for distance calc");
          // If trip not found, maybe fall back to ID filtering? 
          query.trip_id = trip_id;
        }
      } else {
        // Normal trip ID
        query.trip_id = trip_id;
      }
    }

    const passengers = await Passenger.find(query).sort({ entry_timestamp: 1 });

    if (passengers.length === 0) {
      // console.log(`No passengers found for date ${dateStr}, trip ${trip_id}`);
      return res.json({ distance_km: 0, success: false, message: 'No passengers found' });
    }

    // Find the very first entry point and the very last exit point
    // We filter for valid locations only
    const validEntryPoints = passengers.filter(p => p.entryLocation && p.entryLocation.latitude && p.entryLocation.longitude);
    const validExitPoints = passengers.filter(p => p.exitLocation && p.exitLocation.latitude && p.exitLocation.longitude);

    // If we don't have enough data points calculate distance
    if (validEntryPoints.length === 0) {
      return res.json({ distance_km: 0, success: false, message: 'No valid GPS points found' });
    }

    const firstPoint = validEntryPoints[0].entryLocation;

    // Ideally use the last exit. If no exits recorded, use the last entry as the end point (better than nothing)
    let lastPoint = null;
    if (validExitPoints.length > 0) {
      lastPoint = validExitPoints[validExitPoints.length - 1].exitLocation;
    } else {
      lastPoint = validEntryPoints[validEntryPoints.length - 1].entryLocation;
    }

    // If start and end are close/same (e.g. single passenger, no exit), distance is 0
    if (!lastPoint || (firstPoint.latitude === lastPoint.latitude && firstPoint.longitude === lastPoint.longitude)) {
      return res.json({
        distance_km: 0,
        success: true,
        message: 'Start and end points are identical or missing'
      });
    }

    const startLat = firstPoint.latitude;
    const startLon = firstPoint.longitude;
    const endLat = lastPoint.latitude;
    const endLon = lastPoint.longitude;

    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}`;

    try {
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
    } catch (osrmError) {
      console.error("OSRM call failed, returning 0 distance:", osrmError.message);
      // Fallback to direct calculation or just return 0
    }

    res.json({ distance_km: 0, success: false, message: 'Could not calculate distance' });
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
