const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getScheduledTrips } = require('../controllers/scheduleController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/scheduled-trips
router.get('/', getScheduledTrips);

module.exports = router;
