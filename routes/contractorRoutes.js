const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    getContractors,
    getContractorByBusId,
    upsertContractor,
    deleteContractor
} = require('../controllers/contractorController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/contractors
router.get('/', getContractors);

// @route   GET /api/contractors/:bus_id
router.get('/:bus_id', getContractorByBusId);

// @route   POST /api/contractors
router.post('/', upsertContractor);

// @route   DELETE /api/contractors/:bus_id
router.delete('/:bus_id', deleteContractor);

module.exports = router;
