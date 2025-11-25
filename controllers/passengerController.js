const Passenger = require('../models/Passenger');
const BusSchedule = require('../models/BusSchedule');

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
    
    const query = {};
    
    // Handle scheduled trip filtering
    if (trip_id && trip_id !== 'ALL') {
      if (trip_id.startsWith('SCHEDULED_')) {
        const parts = trip_id.split('_');
        const tripIndex = parseInt(parts[parts.length - 1]);
        const busIdFromTrip = parts.slice(1, -2).join('_');
        const dateFromTrip = parts[parts.length - 2];
        
        const schedule = await BusSchedule.findOne({ bus_id: busIdFromTrip });
        
        if (schedule && schedule.trips && schedule.trips[tripIndex]) {
          const scheduledTrip = schedule.trips[tripIndex];
          const departureTime = scheduledTrip.departure_time || scheduledTrip.boarding_start_time;
          const [depHour, depMin] = departureTime.split(':').map(Number);
          
          console.log(`🎯 Filtering for scheduled trip: ${trip_id}`);
          console.log(`   Departure time: ${departureTime}`);
          console.log(`   Date: ${dateFromTrip}`);
          
          // Create time window: ±30 minutes around departure time (more precise filtering)
          const departureDate = new Date(`${dateFromTrip}T${departureTime}:00`);
          const startWindow = new Date(departureDate.getTime() - 30 * 60 * 1000); // 30 min before
          const endWindow = new Date(departureDate.getTime() + 30 * 60 * 1000);   // 30 min after
          
          console.log(`   Time window: ${startWindow.toISOString()} to ${endWindow.toISOString()}`);
          
          query.bus_id = busIdFromTrip;
          query.entry_timestamp = {
            $gte: startWindow,
            $lte: endWindow
          };
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
    const { date } = req.query;
    
    let query = {};
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.entry_timestamp = {
        $gte: startOfDay,
        $lte: endOfDay
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
