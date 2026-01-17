const UnmatchedPassenger = require('../models/UnmatchedPassenger');
const BusSchedule = require('../models/BusSchedule');

// @desc    Get unmatched passengers with filters and pagination
// @route   GET /api/unmatched
// @access  Private
const getUnmatched = async (req, res) => {
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

    // Handle trip filtering
    if (trip_id && trip_id !== 'ALL') {
      let isVirtualTrip = trip_id.startsWith('SCHEDULED_');
      let tripIndex = -1;
      let dateFromTrip = date ? date.substring(0, 10) : '';
      let busIdFromTrip = bus_id;

      if (isVirtualTrip) {
        const parts = trip_id.split('_');
        tripIndex = parseInt(parts[parts.length - 1]);
        dateFromTrip = parts[parts.length - 2];
        busIdFromTrip = parts.slice(1, -2).join('_');
      }

      // ALWAYS try to use the time window if we can find a schedule
      // This solves the Jan 16 issue where all records have the SAME trip_id
      let schedule = await BusSchedule.findOne({ bus_id: busIdFromTrip });
      if (!schedule) {
        const ScheduleHistory = require('../models/ScheduleHistory');
        const history = await ScheduleHistory.findOne({ bus_id: busIdFromTrip, date: dateFromTrip });
        if (history && history.trips) schedule = history;
      }

      // If we have a schedule and a trip index
      if (schedule && schedule.trips) {
        // If it wasn't a virtual ID, try to find which index this real trip_id might correspond to based on time
        if (tripIndex === -1 && trip_id.includes('_')) {
          // This is a bit of a heuristic for real IDs that contain a time
          const timePart = trip_id.split('_').pop();
          tripIndex = schedule.trips.findIndex(t => t.departure_time === timePart || t.boarding_start_time === timePart);
        }

        if (tripIndex !== -1 && schedule.trips[tripIndex]) {
          const currentTrip = schedule.trips[tripIndex];
          const departureTime = currentTrip.departure_time || currentTrip.boarding_start_time || '00:00';
          const tripStartTime = new Date(`${dateFromTrip}T${departureTime}:00.000+05:30`);

          // Window starts 15 mins before this trip
          let startMs = tripStartTime.getTime() - (15 * 60 * 1000);

          // Window ends exactly when the next trip's window starts (Departure_Next - 15m)
          let endMs = tripStartTime.getTime() + (4 * 60 * 60 * 1000); // Default

          if (schedule.trips[tripIndex + 1]) {
            const nextTime = schedule.trips[tripIndex + 1].departure_time || schedule.trips[tripIndex + 1].boarding_start_time;
            if (nextTime) {
              const nextStartTime = new Date(`${dateFromTrip}T${nextTime}:00.000+05:30`);
              endMs = nextStartTime.getTime() - (15 * 60 * 1000);
            }
          }

          query.bus_id = busIdFromTrip;
          query.timestamp = { $gte: new Date(startMs), $lte: new Date(endMs) };
          console.log(`🎯 Filtered Trip Slot ${tripIndex} for ${dateFromTrip} | Window (UTC): ${new Date(startMs).toISOString()} to ${new Date(endMs).toISOString()}`);
        } else {
          query.trip_id = trip_id;
        }
      } else {
        query.trip_id = trip_id;
      }
    }

    // Filter by date
    if (date && !query.timestamp && !query.trip_id) {
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

    // Filter by bus_id
    if (bus_id && bus_id !== 'ALL' && !query.bus_id) {
      query.bus_id = bus_id;
    }

    const [unmatched, total] = await Promise.all([
      UnmatchedPassenger.find(query)
        .select('-face_embedding -__v')
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
};

module.exports = {
  getUnmatched
};
