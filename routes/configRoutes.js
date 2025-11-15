const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  updatePriceConfig,
  syncPowerConfig
} = require('../controllers/configController');

// All routes are protected
router.use(verifyToken);

// @route   POST /api/config/price
router.post('/price', updatePriceConfig);

// @route   POST /api/config/sync-power
router.post('/sync-power', syncPowerConfig);

module.exports = router;
