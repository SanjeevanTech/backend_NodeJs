const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getFareStages,
  calculateFare,
  bulkImportFareStages,
  updateFareStage
} = require('../controllers/fareController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/fare/stages
router.get('/stages', getFareStages);

// @route   GET /api/fare/calculate
router.get('/calculate', calculateFare);

// @route   POST /api/fare/stages/bulk
router.post('/stages/bulk', bulkImportFareStages);

// @route   PUT /api/fare/stages/:stageNumber
router.put('/stages/:stageNumber', updateFareStage);

module.exports = router;
