const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getPassengers,
  getPassengersByDateRange,
  getStats
} = require('../controllers/passengerController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/passengers
router.get('/', getPassengers);

// @route   GET /api/passengers/date-range
router.get('/date-range', getPassengersByDateRange);

// @route   GET /api/passengers/stats (moved from /api/stats)
router.get('/stats', getStats);

module.exports = router;
