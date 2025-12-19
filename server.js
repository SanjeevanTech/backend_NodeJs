const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(compression());
app.use(cookieParser());

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  'https://frontend-indol-one-90.vercel.app',
  'https://frontend-git-main-sanjeevan-s-projects.vercel.app',
  'https://frontend-4j4yi542s-sanjeevan-s-projects.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// DATABASE CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb+srv://sanjeeBusPassenger:Hz3czXqVoc4ThTiO@buspassenger.lskaqo5.mongodb.net/bus_passenger_db?retryWrites=true&w=majority&appName=BusPassenger';

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ============================================
// ROUTES
// ============================================

// Auth Routes (Public)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Passenger Routes (Protected)
const passengerRoutes = require('./routes/passengerRoutes');
app.use('/api/passengers', passengerRoutes);

// Trip Routes (Protected)
const tripRoutes = require('./routes/tripRoutes');
app.use('/api/trips', tripRoutes);

// Unmatched Routes (Protected)
const unmatchedRoutes = require('./routes/unmatchedRoutes');
app.use('/api/unmatched', unmatchedRoutes);

// Schedule Routes (Protected)
const scheduleRoutes = require('./routes/scheduleRoutes');
app.use('/api/bus-schedule', scheduleRoutes);

// Scheduled Trips Routes (Protected) - Separate router
const scheduledTripsRoutes = require('./routes/scheduledTripsRoutes');
app.use('/api/scheduled-trips', scheduledTripsRoutes);

// Route Routes (Protected)
const routeRoutes = require('./routes/routeRoutes');
app.use('/api/route-distance', routeRoutes);
app.use('/api/routes', routeRoutes);

// Config Routes (Protected)
const configRoutes = require('./routes/configRoutes');
app.use('/api/config', configRoutes);

// Power Config Routes (Protected)
const powerConfigRoutes = require('./routes/powerConfigRoutes');
app.use('/api/power-config', powerConfigRoutes);

// Fare Routes (Protected)
const fareRoutes = require('./routes/fareRoutes');
app.use('/api/fare', fareRoutes);

// Season Ticket Routes (Protected)
const seasonTicketRoutes = require('./routes/seasonTicketRoutes');
app.use('/api/season-ticket', seasonTicketRoutes);

// Bus Route Routes (Protected)
const busRouteRoutes = require('./routes/busRouteRoutes');
app.use('/api/bus-routes', busRouteRoutes);

// Waypoint Group Routes (Protected)
const waypointGroupRoutes = require('./routes/waypointGroupRoutes');
app.use('/api/waypoint-groups', waypointGroupRoutes);

// Contractor Routes (Protected)
const contractorRoutes = require('./routes/contractorRoutes');
app.use('/api/contractors', contractorRoutes);

// ============================================
// PYTHON SERVER PROXY
// ============================================
const axios = require('axios');
const { verifyToken } = require('./middleware/auth');
const PYTHON_SERVER = process.env.PYTHON_SERVER_URL || 'http://127.0.0.1:8888';

// Python server proxy (Protected)
app.get('/api/python/*', verifyToken, async (req, res) => {
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
      message: 'Failed to connect to Python server',
      error: error.message
    });
  }
});

// Get real-time trip status (Protected)
app.get('/api/trip/current', verifyToken, async (req, res) => {
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

// Get real-time stats (Protected)
app.get('/api/python-stats', verifyToken, async (req, res) => {
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

// ============================================
// HEALTH CHECK & 404 HANDLER
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler - must be after all other routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/passengers`);
  console.log(`🎫 Fare System: Sri Lankan Stage-based (NTC 2025)`);
  console.log(`📋 Fare Stages API: http://localhost:${PORT}/api/fare/stages`);
  console.log(`🔗 Python Proxy: Forwarding /api/python/* to ${PYTHON_SERVER}`);
  console.log(`✅ MVC Pattern: Models → Controllers → Routes`);
});
