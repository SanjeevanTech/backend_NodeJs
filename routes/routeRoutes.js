const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  calculateRouteDistance,
  createRoute,
  updateRoute,
  deleteRoute
} = require('../controllers/routeController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/route-distance
router.get('/distance', calculateRouteDistance);

// @route   POST /api/routes
router.post('/', createRoute);

// @route   PUT /api/routes/:id
router.put('/:id', updateRoute);

// @route   DELETE /api/routes/:id
router.delete('/:id', deleteRoute);

module.exports = router;
