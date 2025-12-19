const Passenger = require('../models/Passenger');
const BusSchedule = require('../models/BusSchedule');
const ScheduleHistory = require('../models/ScheduleHistory');

console.log("🚀 Passenger Controller Loaded - Schedule History Support Added");

// @desc    Get all passengers with filters and pagination
// @route   GET /api/passengers
// @access  Private
const getPassengers = async (req, res) => {
  try {
    const {
      limit = 50,
      skip = 0,
      trip_id,
      bus_id,
      date
    } = req.query;

    console.log(`📥 API Call: getPassengers | Trip: ${trip_id} | Bus: ${bus_id} | Date: ${date}`);

    const query = {};

    // Handle scheduled trip filtering
    if (trip_id && trip_id !== 'ALL') {
      if (trip_id.startsWith('SCHEDULED_')) {
        const parts = trip_id.split('_');
        const tripIndex = parseInt(parts[parts.length - 1]);
        const busIdFromTrip = parts.slice(1, -2).join('_');
        const dateFromTrip = parts[parts.length - 2];

        // Check if this is a historical date
        const tripDate = new Date(dateFromTrip);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        tripDate.setHours(0, 0, 0, 0);
        const isHistoricalDate = tripDate < today;

        if (isHistoricalDate) {
          console.log(`🎯 Filtering for historical scheduled trip ID: ${trip_id}`);
          console.log(`   Date from trip ID: ${dateFromTrip}, Trip index: ${tripIndex}`);

          // First, check if we have schedule history for this date
          const scheduleHistory = await ScheduleHistory.findOne({
            bus_id: busIdFromTrip,
            date: dateFromTrip
          });

          if (scheduleHistory && scheduleHistory.trips && scheduleHistory.trips[tripIndex]) {
            // Use the saved schedule history
            console.log(`   ✅ Using saved schedule history for ${dateFromTrip}`);
            const scheduledTrip = scheduleHistory.trips[tripIndex];
            const departureTime = scheduledTrip.departure_time || scheduledTrip.boarding_start_time;
            const arrivalTime = scheduledTrip.estimated_arrival_time;

            console.log(`   Trip: ${scheduledTrip.trip_name}`);
            console.log(`   Departure: ${departureTime}, Arrival: ${arrivalTime}`);

            // Create time window using the historical schedule
            const tripDateTimeStr = `${dateFromTrip}T${departureTime}:00.000+05:30`;
            const tripDateTime = new Date(tripDateTimeStr);

            // Create window ±3 hours around the scheduled time
            const startWindow = new Date(tripDateTime.getTime() - 3 * 60 * 60 * 1000);
            const endWindow = new Date(tripDateTime.getTime() + 3 * 60 * 60 * 1000);

            console.log(`   Time window (±3 hours): ${startWindow.toISOString()} to ${endWindow.toISOString()}`);

            query.bus_id = busIdFromTrip;
            query.entry_timestamp = {
              $gte: startWindow,
              $lte: endWindow
            };
          } else {
            // No schedule history, fall back to deriving from passenger data
            console.log(`   ⚠️ No schedule history - deriving from passenger data`);

            // Query passengers for this date and bus, grouped by time windows
            const dayPassengers = await Passenger.find({
              bus_id: busIdFromTrip,
              entry_timestamp: {
                $gte: new Date(dateFromTrip + 'T00:00:00.000Z'),
                $lte: new Date(dateFromTrip + 'T23:59:59.999Z')
              }
            }).sort({ entry_timestamp: 1 }).lean();

            // Group passengers into trips based on 4-hour windows (same logic as getTrips)
            const tripWindows = {};
            for (const p of dayPassengers) {
              const entryHour = new Date(p.entry_timestamp).getUTCHours();
              const windowKey = Math.floor(entryHour / 4);
              if (!tripWindows[windowKey]) {
                tripWindows[windowKey] = [];
              }
              tripWindows[windowKey].push(p);
            }

            // Sort windows and get the correct trip
            const sortedWindows = Object.keys(tripWindows).sort((a, b) => parseInt(a) - parseInt(b));

            if (tripIndex < sortedWindows.length) {
              const targetWindow = sortedWindows[tripIndex];
              const targetPassengers = tripWindows[targetWindow];

              // Get time bounds for this window
              const firstEntry = new Date(targetPassengers[0].entry_timestamp);
              const lastEntry = new Date(targetPassengers[targetPassengers.length - 1].entry_timestamp);

              // Create a window ±30 minutes around the actual data bounds
              const startWindow = new Date(firstEntry.getTime() - 30 * 60 * 1000);
              const endWindow = new Date(lastEntry.getTime() + 30 * 60 * 1000);

              console.log(`   Historical trip window: ${startWindow.toISOString()} to ${endWindow.toISOString()}`);

              query.bus_id = busIdFromTrip;
              query.entry_timestamp = {
                $gte: startWindow,
                $lte: endWindow
              };
            } else {
              console.log(`   Trip index ${tripIndex} not found in historical data`);
              // Return empty results if trip index doesn't exist
              query.bus_id = busIdFromTrip;
              query.entry_timestamp = {
                $gte: new Date(dateFromTrip + 'T00:00:00.000Z'),
                $lte: new Date(dateFromTrip + 'T00:00:00.001Z') // Basically no results
              };
            }
          }
        } else {
          // For current/future dates, use the schedule
          let schedule = await BusSchedule.findOne({ bus_id: busIdFromTrip });

          // FALLBACK: If no record in BusSchedule, check powerConfigs
          if (!schedule) {
            console.log(`   ⚠️ No schedule in bus_schedules for ${busIdFromTrip}, checking powerConfigs fallback`);
            const mongoose = require('mongoose');
            const PowerConfig = mongoose.models.PowerConfig || mongoose.model('PowerConfig', new mongoose.Schema({}, { strict: false }), 'powerConfigs');
            schedule = await PowerConfig.findOne({ bus_id: busIdFromTrip });
          }

          if (schedule && schedule.trips && schedule.trips[tripIndex]) {
            const scheduledTrip = schedule.trips[tripIndex];
            const departureTime = scheduledTrip.departure_time || scheduledTrip.boarding_start_time;

            console.log(`🎯 Filtering for scheduled trip ID: ${trip_id}`);
            console.log(`   Found Trip Name: ${scheduledTrip.trip_name}`);
            console.log(`   Departure time (Sched): ${departureTime}`);
            console.log(`   Date (Sched): ${dateFromTrip}`);

            // FIX: Treat departure time as Local Time (+05:30 for Sri Lanka) to get correct UTC window
            const tripDateTimeStr = `${dateFromTrip}T${departureTime}:00.000+05:30`;
            const tripDateTime = new Date(tripDateTimeStr);

            // Create window ±3 hours around the scheduled time
            const startWindow = new Date(tripDateTime.getTime() - 3 * 60 * 60 * 1000);
            const endWindow = new Date(tripDateTime.getTime() + 3 * 60 * 60 * 1000);

            console.log(`   Time window (±3 hours): ${startWindow.toISOString()} to ${endWindow.toISOString()}`);

            query.bus_id = busIdFromTrip;
            query.entry_timestamp = {
              $gte: startWindow,
              $lte: endWindow
            };
          }
        }
      } else {
        query.trip_id = trip_id;
      }
    }

    if (bus_id && bus_id !== 'ALL' && !query.bus_id) query.bus_id = bus_id;

    if (date && !query.entry_timestamp) {
      const dateStr = date.substring(0, 10);
      query.entry_timestamp = {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lte: new Date(dateStr + 'T23:59:59.999Z')
      };
    }

    const [passengers, total] = await Promise.all([
      Passenger.find(query)
        .select('-__v')
        .sort({ entry_timestamp: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
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
};

// @desc    Get passengers by date range
// @route   GET /api/passengers/date-range
// @access  Private
const getPassengersByDateRange = async (req, res) => {
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
};

// @desc    Get statistics
// @route   GET /api/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const { date, bus_id } = req.query;

    let query = {};
    if (bus_id && bus_id !== 'ALL') {
      query.bus_id = bus_id;
    }

    if (date) {
      const dateStr = date.substring(0, 10);
      query.entry_timestamp = {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lte: new Date(dateStr + 'T23:59:59.999Z')
      };
    }

    const passengers = await Passenger.find(query).lean();

    const totalPassengers = passengers.length;
    const totalDistance = passengers.reduce((sum, p) =>
      sum + (p.distance_info?.distance_km || 0), 0
    );

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
};

module.exports = {
  getPassengers,
  getPassengersByDateRange,
  getStats
};
