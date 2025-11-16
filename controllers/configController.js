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

// @desc    Sync power config with schedule (Deprecated - use /api/power-config instead)
// @route   POST /api/config/sync-power
// @access  Private
const syncPowerConfig = async (req, res) => {
  try {
    res.json({
      status: 'success',
      message: 'This endpoint is deprecated. Use /api/power-config for power management.',
      redirect: '/api/power-config'
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
