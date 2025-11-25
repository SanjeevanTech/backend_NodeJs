const mongoose = require('mongoose');

// Power Config Model (flexible schema for powerConfigs collection)
const PowerConfig = mongoose.model('PowerConfig', 
  new mongoose.Schema({
    bus_id: { type: String, required: true, unique: true },
    bus_name: String,
    trip_start: String,
    trip_end: String,
    smart_power_enabled: { type: Boolean, default: false },
    trip_windows: [{
      start_time: String,
      end_time: String,
      route: String,
      active: { type: Boolean, default: true }
    }],
    power_on_before_minutes: { type: Number, default: 30 },
    power_off_after_minutes: { type: Number, default: 15 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  }, { strict: false }), 
  'powerConfigs'
);

// Bus Schedule Model - Import the proper model
const BusSchedule = require('../models/BusSchedule');

// @desc    Get all power configs
// @route   GET /api/power-config
// @access  Private
const getAllPowerConfigs = async (req, res) => {
  try {
    const configs = await PowerConfig.find({}).sort({ bus_id: 1 });
    
    // Return Python-compatible format: { bus_id: config }
    // This allows frontend to use Object.keys() to get bus IDs
    const busesObject = {};
    configs.forEach(config => {
      busesObject[config.bus_id] = {
        bus_id: config.bus_id,
        bus_name: config.bus_name || config.bus_id,
        deep_sleep_enabled: config.deep_sleep_enabled !== false,
        trip_start: config.trip_start || '00:00',
        trip_end: config.trip_end || '23:59',
        smart_power_enabled: config.smart_power_enabled || false,
        trip_windows: config.trip_windows || [],
        maintenance_interval: config.maintenance_interval || 5,
        maintenance_duration: config.maintenance_duration || 3,
        power_on_before_minutes: config.power_on_before_minutes || 30,
        power_off_after_minutes: config.power_off_after_minutes || 15,
        boards: config.boards || [],
        last_updated: config.updated_at || config.created_at
      };
    });
    
    res.json(busesObject);
  } catch (error) {
    console.error('Error fetching power configs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch power configs',
      error: error.message
    });
  }
};

// @desc    Get power config by bus_id
// @route   GET /api/power-config/:bus_id
// @access  Private
const getPowerConfig = async (req, res) => {
  try {
    const config = await PowerConfig.findOne({ bus_id: req.params.bus_id });
    
    if (!config) {
      return res.status(404).json({
        status: 'error',
        message: 'Power config not found for this bus'
      });
    }
    
    res.json({
      status: 'success',
      config: config
    });
  } catch (error) {
    console.error('Error fetching power config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch power config',
      error: error.message
    });
  }
};

// @desc    Create or update power config
// @route   POST /api/power-config
// @route   PUT /api/power-config/:bus_id
// @access  Private
const savePowerConfig = async (req, res) => {
  try {
    const { bus_id } = req.body;
    
    if (!bus_id) {
      return res.status(400).json({
        status: 'error',
        message: 'bus_id is required'
      });
    }
    
    const configData = {
      ...req.body,
      updated_at: new Date()
    };
    
    // If trip_windows exist, ensure they have default active status
    if (configData.trip_windows && Array.isArray(configData.trip_windows)) {
      configData.trip_windows = configData.trip_windows.map(window => ({
        ...window,
        active: window.active !== undefined ? window.active : true
      }));
    }
    
    const result = await PowerConfig.updateOne(
      { bus_id: bus_id },
      { $set: configData },
      { upsert: true }
    );
    
    // Fetch the updated config
    const updatedConfig = await PowerConfig.findOne({ bus_id: bus_id });
    
    res.json({
      status: 'success',
      message: result.upsertedCount > 0 ? 'Power config created' : 'Power config updated',
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error saving power config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save power config',
      error: error.message
    });
  }
};

// @desc    Delete power config
// @route   DELETE /api/power-config/:bus_id
// @access  Private
const deletePowerConfig = async (req, res) => {
  try {
    const result = await PowerConfig.deleteOne({ bus_id: req.params.bus_id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Power config not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Power config deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting power config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete power config',
      error: error.message
    });
  }
};

// @desc    Toggle smart power for a bus
// @route   PATCH /api/power-config/:bus_id/toggle-smart
// @access  Private
const toggleSmartPower = async (req, res) => {
  try {
    const { bus_id } = req.params;
    const { enabled } = req.body;
    
    const config = await PowerConfig.findOne({ bus_id });
    
    if (!config) {
      return res.status(404).json({
        status: 'error',
        message: 'Power config not found'
      });
    }
    
    config.smart_power_enabled = enabled !== undefined ? enabled : !config.smart_power_enabled;
    config.updated_at = new Date();
    
    await config.save();
    
    res.json({
      status: 'success',
      message: `Smart power ${config.smart_power_enabled ? 'enabled' : 'disabled'}`,
      config: config
    });
  } catch (error) {
    console.error('Error toggling smart power:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle smart power',
      error: error.message
    });
  }
};

// @desc    Get power config statistics
// @route   GET /api/power-config/stats/summary
// @access  Private
const getPowerConfigStats = async (req, res) => {
  try {
    const total = await PowerConfig.countDocuments();
    const smartEnabled = await PowerConfig.countDocuments({ smart_power_enabled: true });
    const withTripWindows = await PowerConfig.countDocuments({ 
      trip_windows: { $exists: true, $ne: [] } 
    });
    
    res.json({
      status: 'success',
      stats: {
        total,
        smartEnabled,
        withTripWindows,
        basicConfig: total - smartEnabled
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// @desc    Sync power config with schedule
// @route   POST /api/power-config/sync
// @access  Private
const syncPowerConfig = async (req, res) => {
  try {
    const { bus_id } = req.body;
    
    if (!bus_id) {
      return res.status(400).json({
        status: 'error',
        message: 'bus_id is required'
      });
    }
    
    const schedule = await BusSchedule.findOne({ bus_id });
    console.log('Syncing power config for bus:', bus_id);
    console.log('Found schedule:', schedule ? 'Yes' : 'No');
    if (schedule) {
      console.log('Schedule trips count:', schedule.trips ? schedule.trips.length : 0);
      if (schedule.trips && schedule.trips.length > 0) {
        console.log('First trip:', JSON.stringify(schedule.trips[0], null, 2));
      }
    }
    
    // If no schedule or no trips, set default times (full day operation)
    if (!schedule || !schedule.trips || schedule.trips.length === 0) {
      const configData = {
        bus_id,
        trip_start: '00:00',
        trip_end: '23:59',
        updated_at: new Date()
      };
      
      await PowerConfig.updateOne(
        { bus_id },
        { $set: configData },
        { upsert: true }
      );
      
      return res.json({
        status: 'success',
        message: 'No trips found - power config set to full day operation',
        trip_start: '00:00',
        trip_end: '23:59',
        bus_id
      });
    }
    
    let earliestStart = null;
    let latestEnd = null;
    const tripWindows = [];
    
    schedule.trips.forEach(trip => {
      // Use boarding_start_time or departure_time as start
      const startTime = trip.boarding_start_time || trip.departure_time || trip.start_time;
      // Use estimated_arrival_time or end_time as end
      const endTime = trip.estimated_arrival_time || trip.end_time;
      
      if (startTime) {
        if (earliestStart === null || startTime < earliestStart) {
          earliestStart = startTime;
        }
      }
      
      if (endTime) {
        if (latestEnd === null || endTime > latestEnd) {
          latestEnd = endTime;
        }
      }
      
      // Create trip window for each trip
      if (startTime && endTime) {
        tripWindows.push({
          start_time: startTime,
          end_time: endTime,
          route: trip.trip_name || trip.direction || schedule.route_name || 'Unknown Route',
          active: trip.active !== undefined ? trip.active : true
        });
      }
    });
    
    // Fallback to default times if no valid times found
    if (earliestStart === null) earliestStart = '00:00';
    if (latestEnd === null) latestEnd = '23:59';
    
    console.log('Calculated times - Start:', earliestStart, 'End:', latestEnd);
    console.log('Trip windows created:', tripWindows.length);
    
    // Update or create power config with calculated times and trip windows
    const configData = {
      bus_id,
      bus_name: schedule.bus_name || bus_id,
      trip_start: earliestStart,
      trip_end: latestEnd,
      trip_windows: tripWindows,
      updated_at: new Date()
    };
    
    await PowerConfig.updateOne(
      { bus_id },
      { $set: configData },
      { upsert: true }
    );
    
    res.json({
      status: 'success',
      message: 'Power config synced with schedule',
      trip_start: earliestStart,
      trip_end: latestEnd,
      bus_id
    });
  } catch (error) {
    console.error('Error syncing power config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to sync power config',
      error: error.message
    });
  }
};

module.exports = {
  getAllPowerConfigs,
  getPowerConfig,
  savePowerConfig,
  deletePowerConfig,
  toggleSmartPower,
  getPowerConfigStats,
  syncPowerConfig
};
