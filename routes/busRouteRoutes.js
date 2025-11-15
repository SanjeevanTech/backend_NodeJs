const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getBusRoutes,
  getBusRouteById,
  createBusRoute,
  updateBusRoute,
  deleteBusRoute,
  getStats
} = require('../controllers/busRouteController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/bus-routes/stats/summary
router.get('/stats/summary', getStats);

// @route   GET /api/bus-routes
router.get('/', getBusRoutes);

// @route   GET /api/bus-routes/:route_id
router.get('/:route_id', getBusRouteById);

// @route   POST /api/bus-routes
router.post('/', createBusRoute);

// @route   PUT /api/bus-routes/:route_id
router.put('/:route_id', updateBusRoute);

// @route   DELETE /api/bus-routes/:route_id
router.delete('/:route_id', deleteBusRoute);

module.exports = router;
