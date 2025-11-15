const mongoose = require('mongoose');

// Helper to get flexible model
const getModel = (modelName, collectionName) => {
  try {
    return mongoose.model(modelName);
  } catch (error) {
    return mongoose.model(modelName, new mongoose.Schema({}, { strict: false }), collectionName);
  }
};

// @desc    Update price configuration
// @route   POST /api/config/price
// @access  Private
const updatePriceConfig = async (req, res) => {
  try {
    const { pricePerKm } = req.body;
    
    if (!pricePerKm || pricePerKm <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid price per km'
      });
    }

    res.json({
      status: 'success',
      message: 'Price configuration updated',
      pricePerKm: pricePerKm
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update price configuration',
      error: error.message
    });
  }
};

// @desc    Sync power config with schedule
// @route   POST /api/sync-power-config
// @access  Private
const syncPowerConfig = async (req, res) => {
  try {
    const BusSchedule = getModel('BusSchedule', 'bus_schedules');
    // Add sync logic here
    res.json({
      status: 'success',
      message: 'Power config synced'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

module.exports = {
  updatePriceConfig,
  syncPowerConfig
};
