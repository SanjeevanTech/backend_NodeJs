const BusSchedule = require('../models/BusSchedule');
const ScheduleHistory = require('../models/ScheduleHistory');
const mongoose = require('mongoose');

// Helper to get flexible model
const getModel = (modelName, collectionName) => {
  try {
    return mongoose.model(modelName);
  } catch (error) {
    return mongoose.model(modelName, new mongoose.Schema({}, { strict: false }), collectionName);
  }
};

// @desc    Get bus schedule by bus_id
// @route   GET /api/bus-schedule/:bus_id
// @access  Private
const getBusSchedule = async (req, res) => {
  try {
    const schedule = await BusSchedule.findOne({ bus_id: req.params.bus_id });
    res.json({ status: 'success', schedule });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
};

// @desc    Save/Update bus schedule
// @route   POST /api/bus-schedule
// @access  Private
const saveBusSchedule = async (req, res) => {
  try {
    // Use the schedule data from the request directly
    const scheduleData = {
      ...req.body,
      updated_at: new Date()
    };

    // Save to main schedule collection (for current/future use)
    const result = await BusSchedule.updateOne(
      { bus_id: req.body.bus_id },
      { $set: scheduleData },
      { upsert: true }
    );

    // Also save to schedule history for today's date
    // This preserves the schedule for historical lookup
    const now = new Date();
    const slNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = slNow.toISOString().substring(0, 10); // YYYY-MM-DD

    const historyData = {
      bus_id: req.body.bus_id,
      date: todayStr,
      route_name: req.body.route_name,
      trips: req.body.trips || [], // This now contains the locked start times
      created_at: new Date()
    };

    // Upsert the history record for today
    // checking if we should preserve existing history trips if we are just updating?
    // The requirement implies we are updating the current state.

    await ScheduleHistory.updateOne(
      { bus_id: req.body.bus_id, date: todayStr },
      { $set: historyData },
      { upsert: true }
    );

    console.log(`📅 Saved schedule history for ${req.body.bus_id} on ${todayStr}`);

    // Get the updated schedule to return
    const updatedSchedule = await BusSchedule.findOne({ bus_id: req.body.bus_id });

    res.json({ status: 'success', result, schedule: updatedSchedule });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
};

// @desc    Get scheduled trips with status
// @route   GET /api/scheduled-trips
// @access  Private
const getScheduledTrips = async (req, res) => {
  try {
    const { date, bus_id } = req.query;
    const now = new Date();
    // Get current time in Sri Lanka (+05:30)
    const slNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const slNowStr = slNow.toISOString().substring(0, 10);

    // Determine the requested date string
    const targetDateStr = date ? date.substring(0, 10) : slNowStr;

    // Use a virtual "currentTime" for comparison based on the date
    let currentTime;
    if (targetDateStr < slNowStr) {
      // Past date: all trips should show as completed
      currentTime = 24 * 60 + 1;
    } else if (targetDateStr > slNowStr) {
      // Future date: all trips should show as upcoming
      currentTime = -1;
    } else {
      // Today: use actual current local time
      currentTime = slNow.getUTCHours() * 60 + slNow.getUTCMinutes();
    }

    const query = bus_id ? { bus_id } : {};

    let schedules = await BusSchedule.find(query);

    console.log('Found schedules in bus_schedules:', schedules.length);

    // If no schedules found, try powerConfigs collection
    if (schedules.length === 0) {
      console.log('Trying powerConfigs collection...');
      const PowerConfig = getModel('PowerConfig', 'powerConfigs');
      schedules = await PowerConfig.find({});
      console.log('Found schedules in powerConfigs:', schedules.length);
    }

    if (schedules.length > 0) {
      console.log('First schedule:', JSON.stringify(schedules[0], null, 2));
    }

    if (schedules.length === 0) {
      return res.json({
        status: 'success',
        trips: [],
        message: 'No schedules found in bus_schedules or powerConfigs'
      });
    }

    const scheduledTrips = [];

    schedules.forEach(schedule => {
      if (schedule.trips && Array.isArray(schedule.trips)) {
        schedule.trips.forEach(trip => {
          if (trip.active === false) return;

          const [startHour, startMin] = trip.boarding_start_time.split(':').map(Number);
          const [endHour, endMin] = trip.estimated_arrival_time.split(':').map(Number);

          const startTime = startHour * 60 + startMin;
          let endTime = endHour * 60 + endMin;

          if (endTime < startTime) {
            endTime += 24 * 60;
          }

          let status = 'upcoming';
          if (currentTime >= startTime && currentTime <= endTime) {
            status = 'active';
          } else if (currentTime > endTime) {
            status = 'completed';
          }

          scheduledTrips.push({
            trip_name: trip.trip_name || 'Bus Trip',
            direction: trip.direction || 'unknown',
            boarding_start_time: trip.boarding_start_time,
            departure_time: trip.departure_time || trip.boarding_start_time,
            estimated_arrival_time: trip.estimated_arrival_time,
            status: status,
            bus_id: schedule.bus_id,
            route_name: schedule.route_name || 'Unknown Route'
          });
        });
      } else if (schedule.trip_start && schedule.trip_end) {
        const [startHour, startMin] = schedule.trip_start.split(':').map(Number);
        const [endHour, endMin] = schedule.trip_end.split(':').map(Number);

        const startTime = startHour * 60 + startMin;
        let endTime = endHour * 60 + endMin;

        if (endTime < startTime) {
          endTime += 24 * 60;
        }

        let status = 'upcoming';
        if (currentTime >= startTime && currentTime <= endTime) {
          status = 'active';
        } else if (currentTime > endTime) {
          status = 'completed';
        }

        scheduledTrips.push({
          trip_name: schedule.bus_name || schedule.bus_id || 'Bus Trip',
          direction: 'route',
          boarding_start_time: schedule.trip_start,
          departure_time: schedule.trip_start,
          estimated_arrival_time: schedule.trip_end,
          status: status,
          bus_id: schedule.bus_id,
          route_name: 'Jaffna-Colombo'
        });
      }
    });

    res.json({
      status: 'success',
      trips: scheduledTrips,
      currentTime: now.toISOString()
    });
  } catch (error) {
    console.error('Error getting scheduled trips:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

module.exports = {
  getBusSchedule,
  saveBusSchedule,
  getScheduledTrips
};
