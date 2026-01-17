const Passenger = require('../models/Passenger');
const BusSchedule = require('../models/BusSchedule');
const ScheduleHistory = require('../models/ScheduleHistory');

// @desc    Get unique trips for a date
// @route   GET /api/trips
// @access  Private
const getTrips = async (req, res) => {
  try {
    const { date, bus_id } = req.query;

    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Date parameter is required'
      });
    }

    const dateStr = date.substring(0, 10);

    // Get current date in Sri Lanka time (+05:30)
    const nowLocal = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = nowLocal.toISOString().substring(0, 10);

    const isHistoricalDate = dateStr < todayStr;

    // Build bus query
    const busQuery = {};
    if (bus_id && bus_id !== 'ALL') {
      busQuery.bus_id = bus_id;
    }

    const allTrips = [];

    if (isHistoricalDate) {
      // For historical dates, first check if we have saved schedule history
      console.log(`📅 Historical date ${dateStr} - checking schedule history`);

      const historyQuery = { date: dateStr };
      if (bus_id && bus_id !== 'ALL') {
        historyQuery.bus_id = bus_id;
      }

      const scheduleHistory = await ScheduleHistory.find(historyQuery);

      if (scheduleHistory.length > 0) {
        // Use the saved schedule history
        console.log(`✅ Found ${scheduleHistory.length} schedule history records for ${dateStr}`);

        for (const history of scheduleHistory) {
          if (history.trips && Array.isArray(history.trips)) {
            for (let i = 0; i < history.trips.length; i++) {
              const trip = history.trips[i];
              const departureTime = trip.departure_time || trip.boarding_start_time;

              if (departureTime) {
                const scheduledTripId = `SCHEDULED_${history.bus_id}_${dateStr}_${i}`;

                allTrips.push({
                  trip_id: scheduledTripId,
                  trip_name: trip.trip_name,
                  bus_id: history.bus_id,
                  route: trip.route,
                  boarding_start_time: trip.boarding_start_time,
                  departure_time: trip.departure_time,
                  end_time: trip.estimated_arrival_time,
                  estimated_arrival_time: trip.estimated_arrival_time,
                  start_time: new Date(`${dateStr}T${departureTime}:00Z`),
                  finish_time: trip.estimated_arrival_time ? new Date(`${dateStr}T${trip.estimated_arrival_time}:00Z`) : null,
                  scheduled: true,
                  trip_index: i,
                  from_history: true
                });
              }
            }
          }
        }

        console.log(`✅ Loaded ${allTrips.length} trips from schedule history`);

      } else {
        // No schedule history, derive from passenger data
        console.log(`⚠️ No schedule history for ${dateStr} - deriving from passenger data`);

        // Find passengers for this date
        const passengerQuery = {
          entry_timestamp: {
            $gte: new Date(dateStr + 'T00:00:00.000Z'),
            $lte: new Date(dateStr + 'T23:59:59.999Z')
          }
        };
        if (bus_id && bus_id !== 'ALL') {
          passengerQuery.bus_id = bus_id;
        }

        // Group passengers by bus and approximate trip times (4-hour windows)
        const passengersByBus = await Passenger.aggregate([
          { $match: passengerQuery },
          {
            $group: {
              _id: {
                bus_id: '$bus_id',
                // Group by 4-hour window to identify distinct trips
                tripWindow: {
                  $floor: {
                    $divide: [{ $hour: '$entry_timestamp' }, 4]
                  }
                }
              },
              firstEntry: { $min: '$entry_timestamp' },
              lastEntry: { $max: '$entry_timestamp' },
              count: { $sum: 1 },
              route_name: { $first: '$route_name' }
            }
          },
          { $sort: { firstEntry: 1 } }
        ]);

        // Create trip entries from passenger data grouped by bus
        const tripsByBus = {};
        for (const group of passengersByBus) {
          const busId = group._id.bus_id;
          if (!tripsByBus[busId]) {
            tripsByBus[busId] = [];
          }
          tripsByBus[busId].push(group);
        }

        // Generate trip objects
        for (const busId of Object.keys(tripsByBus)) {
          const busTrips = tripsByBus[busId];
          busTrips.sort((a, b) => new Date(a.firstEntry) - new Date(b.firstEntry));

          for (let i = 0; i < busTrips.length; i++) {
            const tripData = busTrips[i];
            const entryTime = new Date(tripData.firstEntry);
            const exitTime = new Date(tripData.lastEntry);
            // Convert UTC to local time for display names if needed
            // If the passenger data timestamp is UTC, we should show it in local time (+05:30)
            const showLocal = (dateObj) => {
              const local = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
              return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
            };

            const boardingTimeLocal = showLocal(entryTime);
            const endTimeLocal = showLocal(exitTime);

            const actualTripId = tripData._id; // The grouped trip_id from the database

            allTrips.push({
              trip_id: actualTripId,
              trip_name: tripData.route_name ? `${tripData.route_name} - ${boardingTimeLocal}` : `Trip ${i + 1} - ${boardingTimeLocal}`,
              bus_id: busId,
              route: tripData.route_name || 'Unknown Route',
              boarding_start_time: boardingTimeLocal,
              departure_time: boardingTimeLocal,
              end_time: endTimeLocal,
              estimated_arrival_time: endTimeLocal,
              start_time: tripData.firstEntry,
              finish_time: tripData.lastEntry,
              scheduled: false,
              trip_index: i,
              passenger_count: tripData.count,
              derived_from_data: true
            });
          }
        }

        console.log(`✅ Derived ${allTrips.length} trips from passenger data`);
      }

      // FALLBACK: If we still have no trips for this historical date, use the current schedule/powerConfigs
      if (allTrips.length === 0) {
        console.log(`⚠️ No trips found for historical date ${dateStr} (no history, no derived). Falling back to current schedule.`);
        const fallbackTrips = await getScheduledTripsForDate(dateStr, busQuery);
        allTrips.push(...fallbackTrips);
      }

    } else {
      // For today or future dates, use the current schedule
      console.log(`📅 Current/future date ${dateStr} - using scheduled trips`);

      const scheduledTrips = await getScheduledTripsForDate(dateStr, busQuery);
      allTrips.push(...scheduledTrips);

      console.log(`✅ Returning ${allTrips.length} scheduled trips`);

      // Count passengers for each scheduled trip (only for current/future)
      for (const trip of allTrips) {
        const departureTime = trip.departure_time;
        if (!departureTime) continue;

        const [depHour] = departureTime.split(':').map(Number);

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
    }

    // Sort by departure time
    allTrips.sort((a, b) => {
      const timeA = a.boarding_start_time || a.departure_time || '00:00';
      const timeB = b.boarding_start_time || b.departure_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    res.json({
      status: 'success',
      count: allTrips.length,
      trips: allTrips,
      source: allTrips.length > 0 && allTrips[0].from_history ? 'history' :
        (allTrips.length > 0 && allTrips[0].derived_from_data ? 'passenger_data' : 'scheduled_trips')
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch trips',
      error: error.message
    });
  }
};

// Helper function to get scheduled trips for any date (reusable logic)
async function getScheduledTripsForDate(dateStr, busQuery) {
  const allTrips = [];
  const mongoose = require('mongoose');

  let schedules = await BusSchedule.find(busQuery);

  // If no schedules found in bus_schedules, check powerConfigs
  if (schedules.length === 0) {
    const PowerConfig = mongoose.models.PowerConfig || mongoose.model('PowerConfig', new mongoose.Schema({}, { strict: false }), 'powerConfigs');
    schedules = await PowerConfig.find(busQuery);
  }

  for (const schedule of schedules) {
    if (schedule.trips && Array.isArray(schedule.trips)) {
      for (let i = 0; i < schedule.trips.length; i++) {
        const trip = schedule.trips[i];
        const departureTime = trip.departure_time || trip.boarding_start_time;

        if (departureTime) {
          const scheduledTripId = `SCHEDULED_${schedule.bus_id}_${dateStr}_${i}`;
          allTrips.push({
            trip_id: scheduledTripId,
            trip_name: trip.trip_name,
            bus_id: schedule.bus_id,
            route: trip.route,
            boarding_start_time: trip.boarding_start_time,
            departure_time: trip.departure_time,
            end_time: trip.estimated_arrival_time,
            estimated_arrival_time: trip.estimated_arrival_time,
            start_time: new Date(`${dateStr}T${departureTime}:00Z`),
            finish_time: trip.estimated_arrival_time ? new Date(`${dateStr}T${trip.estimated_arrival_time}:00Z`) : null,
            scheduled: true,
            trip_index: i
          });
        }
      }
    }
  }
  return allTrips;
}

// @desc    Debug endpoint to see raw trip data
// @route   GET /api/trips/debug
// @access  Private
const getTripsDebug = async (req, res) => {
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

    const samplePassengers = await Passenger.find(query)
      .select('trip_id trip_start_time entry_timestamp bus_id')
      .limit(10)
      .lean();

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
};

// @desc    Analyze trip data
// @route   GET /api/trips/analyze
// @access  Private
const analyzeTrips = async (req, res) => {
  try {
    const passengerTrips = await Passenger.aggregate([
      { $match: { trip_id: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$trip_id',
          bus_id: { $first: '$bus_id' },
          route_name: { $first: '$route_name' },
          count: { $sum: 1 },
          firstEntry: { $min: '$entry_timestamp' },
          lastEntry: { $max: '$exit_timestamp' }
        }
      },
      { $sort: { firstEntry: -1 } }
    ]);

    const passengersWithoutTrip = await Passenger.countDocuments({
      $or: [
        { trip_id: { $exists: false } },
        { trip_id: null }
      ]
    });

    const mongoose = require('mongoose');
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
};

module.exports = {
  getTrips,
  getTripsDebug,
  analyzeTrips
};
