const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getAllPowerConfigs,
  getPowerConfig,
  savePowerConfig,
  deletePowerConfig,
  toggleSmartPower,
  getPowerConfigStats
} = require('../controllers/powerConfigController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/power-config/stats/summary
router.get('/stats/summary', getPowerConfigStats);

// @route   GET /api/power-config
router.get('/', getAllPowerConfigs);

// @route   GET /api/power-config/:bus_id
router.get('/:bus_id', getPowerConfig);

// @route   POST /api/power-config
router.post('/', savePowerConfig);

// @route   PUT /api/power-config/:bus_id
router.put('/:bus_id', savePowerConfig);

// @route   PATCH /api/power-config/:bus_id/toggle-smart
router.patch('/:bus_id/toggle-smart', toggleSmartPower);

// @route   DELETE /api/power-config/:bus_id
router.delete('/:bus_id', deletePowerConfig);

module.exports = router;
