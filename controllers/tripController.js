const Passenger = require('../models/Passenger');
const BusSchedule = require('../models/BusSchedule');

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
    
    // Count passengers for each scheduled trip
    for (const trip of allTrips) {
      const departureTime = trip.departure_time;
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
};

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
