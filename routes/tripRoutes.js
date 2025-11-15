const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getTrips,
  getTripsDebug,
  analyzeTrips
} = require('../controllers/tripController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/trips
router.get('/', getTrips);

// @route   GET /api/trips/debug
router.get('/debug', getTripsDebug);

// @route   GET /api/trips/analyze
router.get('/analyze', analyzeTrips);

module.exports = router;
