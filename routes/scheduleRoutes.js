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

// @route   POST /api/bus-schedule (Create or Update schedule - upsert)
router.post('/', saveBusSchedule);

// @route   PUT /api/bus-schedule/:bus_id (Update existing schedule)
router.put('/:bus_id', saveBusSchedule);

module.exports = router;
