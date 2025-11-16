const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getBusSchedule,
  saveBusSchedule,
  getScheduledTrips
} = require('../controllers/scheduleController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/bus-schedule/:bus_id
router.get('/:bus_id', getBusSchedule);

// @route   POST /api/bus-schedule
router.post('/', saveBusSchedule);

module.exports = router;
