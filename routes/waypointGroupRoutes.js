const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getWaypointGroups,
  getWaypointGroupById,
  createWaypointGroup,
  updateWaypointGroup,
  deleteWaypointGroup,
  getUniqueWaypoints
} = require('../controllers/waypointGroupController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/waypoint-groups/waypoints/unique
router.get('/waypoints/unique', getUniqueWaypoints);

// @route   GET /api/waypoint-groups
router.get('/', getWaypointGroups);

// @route   GET /api/waypoint-groups/:group_id
router.get('/:group_id', getWaypointGroupById);

// @route   POST /api/waypoint-groups
router.post('/', createWaypointGroup);

// @route   PUT /api/waypoint-groups/:group_id
router.put('/:group_id', updateWaypointGroup);

// @route   DELETE /api/waypoint-groups/:group_id
router.delete('/:group_id', deleteWaypointGroup);

module.exports = router;
