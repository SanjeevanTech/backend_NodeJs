const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getAllPowerConfigs,
  getPowerConfig,
  savePowerConfig,
  deletePowerConfig,
  toggleSmartPower,
  getPowerConfigStats,
  syncPowerConfig
} = require('../controllers/powerConfigController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/power-config/stats/summary
router.get('/stats/summary', getPowerConfigStats);

// @route   GET /api/power-config
router.get('/', getAllPowerConfigs);

// @route   GET /api/power-config/:bus_id
router.get('/:bus_id', getPowerConfig);

// @route   POST /api/power-config (Create or Update - upsert)
router.post('/', savePowerConfig);

// @route   PUT /api/power-config/sync (Update power config based on schedule)
// IMPORTANT: This must come BEFORE /:bus_id route to avoid matching "sync" as a bus_id
router.put('/sync', syncPowerConfig);

// @route   PUT /api/power-config/:bus_id (Update existing)
router.put('/:bus_id', savePowerConfig);

// Note: Both use savePowerConfig because it does upsert (create if not exists, update if exists)
// This is acceptable for this use case, but ideally should be split into separate functions

// @route   PATCH /api/power-config/:bus_id/toggle-smart
router.patch('/:bus_id/toggle-smart', toggleSmartPower);

// @route   DELETE /api/power-config/:bus_id
router.delete('/:bus_id', deletePowerConfig);

module.exports = router;
