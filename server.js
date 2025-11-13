const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware - OPTIMIZED
app.use(compression()); // Compress all responses (70% size reduction)

// CORS Configuration for Production
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  // Vercel deployment URLs
  'https://frontend-indol-one-90.vercel.app',
  'https://frontend-git-main-sanjeevan-s-projects.vercel.app',
  'https://frontend-4j4yi542s-sanjeevan-s-projects.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import models
const FareStage = require('./models/FareStage');
const UnmatchedPassenger = require('./models/UnmatchedPassenger');

// Define reusable models (to avoid "model already compiled" errors)
const getModel = (modelName, collectionName) => {
  try {
    return mongoose.model(modelName);
  } catch (error) {
    return mongoose.model(modelName, new mongoose.Schema({}, { strict: false }), collectionName);
  }
};

// MongoDB Connection - OPTIMIZED
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://sanjeeBusPassenger:Hz3czXqVoc4ThTiO@buspassenger.lskaqo5.mongodb.net/bus_passenger_db?retryWrites=true&w=majority&appName=BusPassenger';

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10, // Maximum number of connections
  minPoolSize: 2,  // Minimum number of connections
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4 // Use IPv4
})
  .then(() => console.log('✅ Connected to MongoDB (Optimized Pool)'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Passenger Schema - OPTIMIZED with Indexes
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

// OPTIMIZATION: Add indexes for faster queries
passengerSchema.index({ entry_timestamp: -1 });
passengerSchema.index({ bus_id: 1, entry_timestamp: -1 });
passengerSchema.index({ trip_id: 1, entry_timestamp: -1 });
passengerSchema.index({ created_at: -1 });

const Passenger = mongoose.model('Passenger', passengerSchema);

// Price is calculated by Python server and stored in database
// No need to recalculate here

// Import fare routes
const fareRoutes = require('./routes/fareRoutes');
app.use('/api/fare', fareRoutes);

// Import season ticket routes
const seasonTicketRoutes = require('./routes/seasonTicketRoutes');
app.use('/api/season-ticket', seasonTicketRoutes);

// Import bus route routes
const busRouteRoutes = require('./routes/busRouteRoutes');
app.use('/api/bus-routes', busRouteRoutes);

// Import waypoint group routes
const waypointGroupRoutes = require('./routes/waypointGroupRoutes');
app.use('/api/waypoint-groups', waypointGroupRoutes);

// Routes - OPTIMIZED with Pagination
app.get('/api/passengers', async (req, res) => {
  try {
    const { 
      limit = 50, 
      skip = 0, 
      trip_id, 
      bus_id, 
      date 
    } = req.query;
    
    // Build query
    const query = {};
    
    // Handle scheduled trip filtering
    if (trip_id && trip_id !== 'ALL') {
      if (trip_id.startsWith('SCHEDULED_')) {
        // Extract trip info from scheduled trip ID
        const parts = trip_id.split('_');
        const tripIndex = parseInt(parts[parts.length - 1]);
        const busIdFromTrip = parts.slice(1, -2).join('_');
        const dateFromTrip = parts[parts.length - 2];
        
        // Get the scheduled trip details
        const BusSchedule = getModel('BusSchedule', 'bus_schedules');
        const schedule = await BusSchedule.findOne({ bus_id: busIdFromTrip });
        
        if (schedule && schedule.trips && schedule.trips[tripIndex]) {
          const scheduledTrip = schedule.trips[tripIndex];
          const departureTime = scheduledTrip.departure_time;
          const [depHour, depMin] = departureTime.split(':').map(Number);
          
          // Filter passengers within ±2 hours of scheduled departure
          const startWindow = new Date(`${dateFromTrip}T${String(Math.max(0, depHour - 2)).padStart(2, '0')}:00:00Z`);
          const endWindow = new Date(`${dateFromTrip}T${String(Math.min(23, depHour + 2)).padStart(2, '0')}:59:59Z`);
          
          query.bus_id = busIdFromTrip;
          query.entry_timestamp = {
            $gte: startWindow,
            $lte: endWindow
          };
        }
      } else {
        // Regular trip_id filtering
        query.trip_id = trip_id;
      }
    }
    
    if (bus_id && bus_id !== 'ALL' && !query.bus_id) query.bus_id = bus_id;
    
    // Date filter (if not already set by scheduled trip)
    if (date && !query.entry_timestamp) {
      const dateStr = date.substring(0, 10);
      query.entry_timestamp = {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lte: new Date(dateStr + 'T23:59:59.999Z')
      };
    }
    
    // OPTIMIZATION: Parallel queries for count and data
    const [passengers, total] = await Promise.all([
      Passenger.find(query)
        .select('-__v') // Exclude version field
        .sort({ entry_timestamp: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(), // Use lean() for better performance
      Passenger.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      total,
      count: passengers.length,
      limit: parseInt(limit),
      skip: parseInt(skip),
      passengers
    });
  } catch (error) {
    console.error('Error fetching passengers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch passengers',
      error: error.message
    });
  }
});

// Debug endpoint to see raw trip data
app.get('/api/trips/debug', async (req, res) => {
  try {
    const { date, bus_id } = req.query;
    
    const query = {};
    if (bus_id && bus_id !== 'ALL') query.bus_id = bus_id;
    
    if (date) {
      const dateStr = date.substring(0, 10);
      query.entry_timestamp = {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lte: new Date(dateStr + 'T23:59:59.999Z')
      };
    }
    
    // Get sample passengers to see their trip data
    const samplePassengers = await Passenger.find(query)
      .select('trip_id trip_start_time entry_timestamp bus_id')
      .limit(10)
      .lean();
    
    // Get unique trip_ids
    const uniqueTrips = await Passenger.distinct('trip_id', query);
    
    res.json({
      status: 'success',
      date: date,
      bus_id: bus_id || 'ALL',
      unique_trip_count: uniqueTrips.length,
      unique_trip_ids: uniqueTrips,
      sample_passengers: samplePassengers
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get unique trips for a date (for dropdown filter)
// Returns SCHEDULED trips with passenger counts
app.get('/api/trips', async (req, res) => {
  try {
    const { date, bus_id } = req.query;
    
    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Date parameter is required'
      });
    }
    
    const BusSchedule = getModel('BusSchedule', 'bus_schedules');
    const dateStr = date.substring(0, 10);
    
    // Get scheduled trips for this bus
    const query = {};
    if (bus_id && bus_id !== 'ALL') {
      query.bus_id = bus_id;
    }
    
    const schedules = await BusSchedule.find(query);
    
    console.log(`📅 Found ${schedules.length} schedule(s) for query:`, query);
    
    // Extract all scheduled trips
    const allTrips = [];
    
    for (const schedule of schedules) {
      console.log(`📋 Schedule for ${schedule.bus_id}: ${schedule.trips?.length || 0} trips`);
      
      if (schedule.trips && Array.isArray(schedule.trips)) {
        for (let i = 0; i < schedule.trips.length; i++) {
          const trip = schedule.trips[i];
          const departureTime = trip.departure_time || trip.boarding_start_time;
          
          console.log(`  Trip ${i}: ${trip.trip_name} - Depart: ${departureTime}`);
          
          if (departureTime) {
            // Create a unique identifier for this scheduled trip
            const scheduledTripId = `SCHEDULED_${schedule.bus_id}_${dateStr}_${i}`;
            
            allTrips.push({
              trip_id: scheduledTripId,
              trip_name: trip.trip_name,
              bus_id: schedule.bus_id,
              route: trip.route,
              boarding_start_time: trip.boarding_start_time,
              departure_time: trip.departure_time,
              estimated_arrival_time: trip.estimated_arrival_time,
              start_time: new Date(`${dateStr}T${departureTime}:00Z`),
              scheduled: true,
              trip_index: i
            });
          }
        }
      }
    }
    
    console.log(`✅ Returning ${allTrips.length} scheduled trips`);
    
    // Sort by departure time
    allTrips.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    // Count passengers for each scheduled trip by matching boarding times
    for (const trip of allTrips) {
      const departureTime = trip.departure_time;
      const [depHour, depMin] = departureTime.split(':').map(Number);
      
      // Match passengers within ±2 hours of scheduled departure
      const startWindow = new Date(`${dateStr}T${String(Math.max(0, depHour - 2)).padStart(2, '0')}:00:00Z`);
      const endWindow = new Date(`${dateStr}T${String(Math.min(23, depHour + 2)).padStart(2, '0')}:59:59Z`);
      
      const passengerCount = await Passenger.countDocuments({
        bus_id: trip.bus_id,
        entry_timestamp: {
          $gte: startWindow,
          $lte: endWindow
        }
      });
      
      trip.passenger_count = passengerCount;
    }
    
    res.json({
      status: 'success',
      count: allTrips.length,
      trips: allTrips,
      source: 'scheduled_trips'
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch trips',
      error: error.message
    });
  }
});

// Get passengers by date range
app.get('/api/passengers/date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.entry_timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const passengers = await Passenger.find(query)
      .sort({ entry_timestamp: -1 })
      .lean();

    // Price is already calculated by Python server and stored in database
    res.json({
      status: 'success',
      total: passengers.length,
      passengers: passengers
    });
  } catch (error) {
    console.error('Error fetching passengers by date:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch passengers',
      error: error.message
    });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = {};
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.entry_timestamp = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const passengers = await Passenger.find(query).lean();
    
    const totalPassengers = passengers.length;
    const totalDistance = passengers.reduce((sum, p) => 
      sum + (p.distance_info?.distance_km || 0), 0
    );
    
    // Sum revenue from prices already stored in database by Python server
    const totalRevenue = passengers.reduce((sum, p) => 
      sum + (p.price || 0), 0
    );

    res.json({
      status: 'success',
      stats: {
        totalPassengers,
        totalDistance: totalDistance.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        averageDistance: totalPassengers > 0 ? (totalDistance / totalPassengers).toFixed(2) : 0,
        averageRevenue: totalPassengers > 0 ? (totalRevenue / totalPassengers).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to calculate statistics',
      error: error.message
    });
  }
});

// Get unmatched passengers - OPTIMIZED with Pagination
app.get('/api/unmatched', async (req, res) => {
  try {
    const { 
      date, 
      type, 
      bus_id,
      trip_id,
      limit = 50, 
      skip = 0 
    } = req.query;
    
    let query = {};
    
    // Handle scheduled trip filtering
    if (trip_id && trip_id !== 'ALL') {
      if (trip_id.startsWith('SCHEDULED_')) {
        // Extract trip info from scheduled trip ID
        const parts = trip_id.split('_');
        const tripIndex = parseInt(parts[parts.length - 1]);
        const busIdFromTrip = parts.slice(1, -2).join('_');
        const dateFromTrip = parts[parts.length - 2];
        
        // Get the scheduled trip details
        const BusSchedule = getModel('BusSchedule', 'bus_schedules');
        const schedule = await BusSchedule.findOne({ bus_id: busIdFromTrip });
        
        if (schedule && schedule.trips && schedule.trips[tripIndex]) {
          const scheduledTrip = schedule.trips[tripIndex];
          const departureTime = scheduledTrip.departure_time;
          const [depHour, depMin] = departureTime.split(':').map(Number);
          
          // Filter unmatched within ±2 hours of scheduled departure
          const startWindow = new Date(`${dateFromTrip}T${String(Math.max(0, depHour - 2)).padStart(2, '0')}:00:00Z`);
          const endWindow = new Date(`${dateFromTrip}T${String(Math.min(23, depHour + 2)).padStart(2, '0')}:59:59Z`);
          
          query.bus_id = busIdFromTrip;
          query.timestamp = {
            $gte: startWindow,
            $lte: endWindow
          };
        }
      } else {
        // Regular trip_id filtering
        query.trip_id = trip_id;
      }
    }
    
    // Filter by date (if not already set by scheduled trip)
    if (date && !query.timestamp) {
      const dateStr = date.substring(0, 10);
      query.timestamp = {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lte: new Date(dateStr + 'T23:59:59.999Z')
      };
    }
    
    // Filter by type
    if (type) {
      query.type = type.toUpperCase();
    }
    
    // Filter by bus_id (if not already set by scheduled trip)
    if (bus_id && bus_id !== 'ALL' && !query.bus_id) {
      query.bus_id = bus_id;
    }
    
    // OPTIMIZATION: Parallel queries
    const [unmatched, total] = await Promise.all([
      UnmatchedPassenger.find(query)
        .select('-face_embedding -__v') // Exclude large fields
        .sort({ timestamp: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
      UnmatchedPassenger.countDocuments(query)
    ]);
    
    res.json({
      status: 'success',
      total,
      count: unmatched.length,
      limit: parseInt(limit),
      skip: parseInt(skip),
      unmatched
    });
  } catch (error) {
    console.error('Error fetching unmatched passengers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch unmatched passengers',
      error: error.message
    });
  }
});

// Update price configuration
app.post('/api/config/price', async (req, res) => {
  try {
    const { pricePerKm } = req.body;
    
    if (!pricePerKm || pricePerKm <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid price per km'
      });
    }

    // In production, save to database or config file
    // For now, just return success
    res.json({
      status: 'success',
      message: 'Price configuration updated',
      pricePerKm: pricePerKm
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update price configuration',
      error: error.message
    });
  }
});

// Proxy routes to Python server
const axios = require('axios');
const PYTHON_SERVER = process.env.PYTHON_SERVER_URL || 'http://127.0.0.1:8888';  // Use env variable in production

// Python server proxy for real-time data
app.get('/api/python/*', async (req, res) => {
  try {
    const pythonPath = req.path.replace('/api/python', '');
    const response = await axios.get(`${PYTHON_SERVER}${pythonPath}`, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Python proxy error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Python server. Make sure simplified_bus_server.py is running on port 8888.',
      error: error.message
    });
  }
});

// Get real-time trip status from Python server
app.get('/api/trip/current', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVER}/trip/current`, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error getting trip status:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get current trip status',
      error: error.message
    });
  }
});

// Get real-time stats from Python server
app.get('/api/python-stats', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVER}/status`, {
      timeout: 5000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error getting Python stats:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get real-time stats',
      error: error.message
    });
  }
});

// Calculate route distance using OSRM
app.get('/api/route-distance', async (req, res) => {
  try {
    const { date, trip_id, bus_id } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get passengers for the specified date
    const dateStr = date.substring(0, 10); // Extract YYYY-MM-DD
    const passengers = await Passenger.find({
      entry_timestamp: {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lt: new Date(dateStr + 'T23:59:59.999Z')
      }
    }).sort({ entry_timestamp: 1 });

    // Filter by trip if specified
    let filteredPassengers = passengers;
    if (trip_id && trip_id !== 'ALL') {
      filteredPassengers = passengers.filter(p => p.trip_id === trip_id);
    }

    // Filter by bus if specified
    if (bus_id) {
      filteredPassengers = filteredPassengers.filter(p => p.bus_id === bus_id);
    }

    if (filteredPassengers.length === 0) {
      return res.json({ distance_km: 0, success: false, message: 'No passengers found' });
    }

    // Get first entry and last exit locations
    const firstPassenger = filteredPassengers[0];
    const lastPassenger = filteredPassengers[filteredPassengers.length - 1];

    const startLat = firstPassenger.entryLocation?.latitude;
    const startLon = firstPassenger.entryLocation?.longitude;
    const endLat = lastPassenger.exitLocation?.latitude;
    const endLon = lastPassenger.exitLocation?.longitude;

    if (!startLat || !startLon || !endLat || !endLon) {
      return res.json({ distance_km: 0, success: false, message: 'Missing GPS coordinates' });
    }

    // Call OSRM API for road distance
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}`;
    const axios = require('axios');
    
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
});

// Get scheduled trips with status (upcoming/active/completed)
app.get('/api/scheduled-trips', async (req, res) => {
  try {
    const { date, bus_id } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    // Build query filter
    const query = bus_id ? { bus_id } : {};
    
    // Get bus schedules from database (flexible schema)
    const BusSchedule = getModel('BusSchedule', 'bus_schedules');
    let schedules = await BusSchedule.find(query);
    
    console.log('Found schedules in bus_schedules:', schedules.length);
    
    // If no schedules found, try powerConfigs collection (alternative location)
    if (schedules.length === 0) {
      console.log('Trying powerConfigs collection...');
      const PowerConfig = getModel('PowerConfig', 'powerConfigs');
      schedules = await PowerConfig.find({});
      console.log('Found schedules in powerConfigs:', schedules.length);
    }
    
    if (schedules.length > 0) {
      console.log('First schedule:', JSON.stringify(schedules[0], null, 2));
    }
    
    if (schedules.length === 0) {
      return res.json({
        status: 'success',
        trips: [],
        message: 'No schedules found in bus_schedules or powerConfigs'
      });
    }
    
    // Get all scheduled trips for today
    const scheduledTrips = [];
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
    
    schedules.forEach(schedule => {
      // Handle two different data structures:
      // 1. New format: schedule.trips array
      // 2. Old format: schedule.trip_start and schedule.trip_end
      
      if (schedule.trips && Array.isArray(schedule.trips)) {
        // New format with trips array
        schedule.trips.forEach(trip => {
          if (trip.active === false) return;
          
          // Parse times
          const [startHour, startMin] = trip.boarding_start_time.split(':').map(Number);
          const [endHour, endMin] = trip.estimated_arrival_time.split(':').map(Number);
          
          const startTime = startHour * 60 + startMin;
          let endTime = endHour * 60 + endMin;
          
          // Handle overnight trips
          if (endTime < startTime) {
            endTime += 24 * 60; // Add 24 hours
          }
          
          // Determine status
          let status = 'upcoming';
          if (currentTime >= startTime && currentTime <= endTime) {
            status = 'active';
          } else if (currentTime > endTime) {
            status = 'completed';
          }
          
          scheduledTrips.push({
            trip_name: trip.trip_name || 'Bus Trip',
            direction: trip.direction || 'unknown',
            boarding_start_time: trip.boarding_start_time,
            departure_time: trip.departure_time || trip.boarding_start_time,
            estimated_arrival_time: trip.estimated_arrival_time,
            status: status,
            bus_id: schedule.bus_id,
            route_name: schedule.route_name || 'Unknown Route'
          });
        });
      } else if (schedule.trip_start && schedule.trip_end) {
        // Old format with trip_start and trip_end directly
        const [startHour, startMin] = schedule.trip_start.split(':').map(Number);
        const [endHour, endMin] = schedule.trip_end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        let endTime = endHour * 60 + endMin;
        
        // Handle overnight trips
        if (endTime < startTime) {
          endTime += 24 * 60; // Add 24 hours
        }
        
        // Determine status
        let status = 'upcoming';
        if (currentTime >= startTime && currentTime <= endTime) {
          status = 'active';
        } else if (currentTime > endTime) {
          status = 'completed';
        }
        
        scheduledTrips.push({
          trip_name: schedule.bus_name || schedule.bus_id || 'Bus Trip',
          direction: 'route',
          boarding_start_time: schedule.trip_start,
          departure_time: schedule.trip_start,
          estimated_arrival_time: schedule.trip_end,
          status: status,
          bus_id: schedule.bus_id,
          route_name: 'Jaffna-Colombo'
        });
      }
    });
    
    res.json({
      status: 'success',
      trips: scheduledTrips,
      currentTime: now.toISOString()
    });
  } catch (error) {
    console.error('Error getting scheduled trips:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Analyze trip data - check what trip_ids passengers are using
app.get('/api/analyze-trips', async (req, res) => {
  try {
    // Get all unique trip_ids from passengers (only those with trip_id)
    const passengerTrips = await Passenger.aggregate([
      { $match: { trip_id: { $exists: true, $ne: null } } },  // Only passengers with trip_id
      {
        $group: {
          _id: '$trip_id',
          bus_id: { $first: '$bus_id' },  // Add bus_id
          route_name: { $first: '$route_name' },  // Add route_name
          count: { $sum: 1 },
          firstEntry: { $min: '$entry_timestamp' },
          lastEntry: { $max: '$exit_timestamp' }
        }
      },
      { $sort: { firstEntry: -1 } }
    ]);

    // Count passengers without trip_id
    const passengersWithoutTrip = await Passenger.countDocuments({
      $or: [
        { trip_id: { $exists: false } },
        { trip_id: null }
      ]
    });

    // Get all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    res.json({
      status: 'success',
      collections: collectionNames,
      passengerTrips: passengerTrips,
      totalPassengers: await Passenger.countDocuments(),
      passengersWithoutTrip: passengersWithoutTrip,
      message: 'Trip analysis complete'
    });
  } catch (error) {
    console.error('Error analyzing trips:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Get bus schedule
app.get('/api/bus-schedule/:bus_id', async (req, res) => {
  try {
    const BusSchedule = getModel('BusSchedule', 'bus_schedules');
    const schedule = await BusSchedule.findOne({ bus_id: req.params.bus_id });
    res.json({ status: 'success', schedule });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Save bus schedule
app.post('/api/bus-schedule', async (req, res) => {
  try {
    const BusSchedule = getModel('BusSchedule', 'bus_schedules');
    
    const scheduleData = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await BusSchedule.updateOne(
      { bus_id: req.body.bus_id },
      { $set: scheduleData },
      { upsert: true }
    );
    
    res.json({ status: 'success', result });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Sync power config with schedule (Smart Power Management)
app.post('/api/sync-power-config', async (req, res) => {
  try {
    const BusSchedule = getModel('BusSchedule', 'bus_schedules');
    const PowerConfig = getModel('PowerConfig', 'powerConfigs');
    
    const schedule = await BusSchedule.findOne({ bus_id: req.body.bus_id, active: true });
    
    if (!schedule || !schedule.trips || schedule.trips.length === 0) {
      return res.json({ status: 'error', message: 'No active trips found' });
    }
    
    // Build trip windows for smart power management
    const trips = schedule.trips.filter(t => t.active !== false);
    const tripWindows = trips.map(trip => {
      const startTime = trip.boarding_start_time || trip.departure_time;
      const endTime = trip.estimated_arrival_time;
      
      return {
        trip_name: trip.trip_name,
        start_time: startTime,
        end_time: endTime,
        route: trip.route || trip.direction
      };
    });
    
    // Also calculate overall window (for backward compatibility)
    const startTimes = trips.map(t => {
      const [h, m] = (t.boarding_start_time || t.departure_time).split(':').map(Number);
      return h * 60 + m;
    });
    const endTimes = trips.map(t => {
      const [h, m] = t.estimated_arrival_time.split(':').map(Number);
      return h * 60 + m;
    });
    
    const earliestStart = Math.min(...startTimes);
    const latestEnd = Math.max(...endTimes);
    
    const trip_start = `${String(Math.floor(earliestStart / 60)).padStart(2, '0')}:${String(earliestStart % 60).padStart(2, '0')}`;
    const trip_end = `${String(Math.floor(latestEnd / 60)).padStart(2, '0')}:${String(latestEnd % 60).padStart(2, '0')}`;
    
    await PowerConfig.updateOne(
      { bus_id: req.body.bus_id },
      {
        $set: {
          trip_start,
          trip_end,
          trip_windows: tripWindows,  // NEW: Array of trip windows
          smart_power_enabled: true,   // NEW: Enable smart power management
          last_updated: new Date(),
          schedule_id: schedule._id
        }
      },
      { upsert: true }
    );
    
    res.json({ 
      status: 'success', 
      trip_start, 
      trip_end,
      trip_windows: tripWindows,
      message: `Smart power: ${tripWindows.length} trip windows configured`
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ESP32 Power Schedule Endpoint (for smart power management)
app.get('/api/esp32/power-schedule/:bus_id', async (req, res) => {
  try {
    const PowerConfig = getModel('PowerConfig', 'powerConfigs');
    const config = await PowerConfig.findOne({ bus_id: req.params.bus_id });
    
    if (!config) {
      return res.json({ 
        status: 'error', 
        message: 'No config found',
        fallback: { trip_start: '00:00', trip_end: '23:59' }
      });
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Find current and next trip window
    let currentTrip = null;
    let nextTrip = null;
    
    if (config.trip_windows && config.smart_power_enabled) {
      for (const window of config.trip_windows) {
        const [startH, startM] = window.start_time.split(':').map(Number);
        const [endH, endM] = window.end_time.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        
        // Check if currently in this trip window
        if (currentTime >= startMin && currentTime <= endMin) {
          currentTrip = window;
        }
        
        // Find next trip
        if (currentTime < startMin && !nextTrip) {
          nextTrip = window;
        }
      }
      
      // If no next trip found today, use first trip tomorrow
      if (!nextTrip && config.trip_windows.length > 0) {
        nextTrip = config.trip_windows[0];
      }
    }
    
    res.json({
      status: 'success',
      bus_id: config.bus_id,
      smart_power_enabled: config.smart_power_enabled || false,
      current_trip: currentTrip,
      next_trip: nextTrip,
      all_trip_windows: config.trip_windows || [],
      fallback: {
        trip_start: config.trip_start,
        trip_end: config.trip_end
      },
      timestamp: now.toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ==================== ROUTE MANAGEMENT APIs ====================

// Get all routes
app.get('/api/routes', async (req, res) => {
  try {
    const Route = getModel('Route', 'routes');
    const routes = await Route.find({}).sort({ route_id: 1 });
    res.json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single route
app.get('/api/routes/:id', async (req, res) => {
  try {
    const Route = getModel('Route', 'routes');
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json({ route });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new route
app.post('/api/routes', async (req, res) => {
  try {
    const Route = getModel('Route', 'routes');
    
    // Check if route_id already exists
    const existing = await Route.findOne({ route_id: req.body.route_id });
    if (existing) {
      return res.status(400).json({ error: 'Route ID already exists' });
    }

    const route = new Route(req.body);
    await route.save();
    res.json({ success: true, route });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update route
app.put('/api/routes/:id', async (req, res) => {
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
});

// Delete route
app.delete('/api/routes/:id', async (req, res) => {
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
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/passengers`);
  console.log(`🎫 Fare System: Sri Lankan Stage-based (NTC 2025)`);
  console.log(`📋 Fare Stages API: http://localhost:${PORT}/api/fare/stages`);
  console.log(`🔗 Python Proxy: Forwarding /api/python/* to ${PYTHON_SERVER}`);
});
