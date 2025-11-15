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
          const departureTime = scheduledTrip.departure_time;
          const [depHour] = departureTime.split(':').map(Number);
          
          const startWindow = new Date(`${dateFromTrip}T${String(Math.max(0, depHour - 2)).padStart(2, '0')}:00:00Z`);
          const endWindow = new Date(`${dateFromTrip}T${String(Math.min(23, depHour + 2)).padStart(2, '0')}:59:59Z`);
          
          query.bus_id = busIdFromTrip;
          query.timestamp = {
            $gte: startWindow,
            $lte: endWindow
          };
        }
      } else {
        query.trip_id = trip_id;
      }
    }
    
    // Filter by date
    if (date && !query.timestamp) {
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
