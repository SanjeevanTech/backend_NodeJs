const BusRoute = require('../models/BusRoute');
const WaypointGroup = require('../models/WaypointGroup');

// @desc    Get all bus routes
// @route   GET /api/bus-routes
// @access  Private
const getBusRoutes = async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = {};
    if (active_only === 'true') {
      query.is_active = true;
    }
    
    const routes = await BusRoute.find(query).sort({ route_name: 1 });
    
    res.json({
      status: 'success',
      total: routes.length,
      routes: routes
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch routes',
      error: error.message
    });
  }
};

// @desc    Get single bus route by ID
// @route   GET /api/bus-routes/:route_id
// @access  Private
const getBusRouteById = async (req, res) => {
  try {
    const route = await BusRoute.findOne({ route_id: req.params.route_id });
    
    if (!route) {
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }
    
    res.json({
      status: 'success',
      route: route
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch route',
      error: error.message
    });
  }
};

// @desc    Create new bus route
// @route   POST /api/bus-routes
// @access  Private
const createBusRoute = async (req, res) => {
  try {
    const {
      route_name,
      description,
      stops,
      waypoint_groups,
      estimated_duration_hours,
      assigned_buses
    } = req.body;
    
    let finalStops = [];
    let total_distance_km = 0;
    
    // Check if using waypoint groups or manual stops
    if (waypoint_groups && waypoint_groups.length > 0) {
      let stopOrder = 1;
      let cumulativeDistance = 0;
      
      const sortedGroups = waypoint_groups.sort((a, b) => a.order - b.order);
      
      for (const groupRef of sortedGroups) {
        const group = await WaypointGroup.findOne({ group_id: groupRef.group_id });
        
        if (!group) {
          return res.status(400).json({
            status: 'error',
            message: `Waypoint group ${groupRef.group_id} not found`
          });
        }
        
        for (const waypoint of group.waypoints) {
          finalStops.push({
            stop_name: waypoint.name,
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            stop_order: stopOrder++,
            distance_from_start_km: cumulativeDistance
          });
          
          cumulativeDistance += 10;
        }
      }
      
      total_distance_km = cumulativeDistance;
      
    } else if (stops && stops.length >= 2) {
      finalStops = stops.sort((a, b) => a.stop_order - b.stop_order);
      total_distance_km = finalStops[finalStops.length - 1].distance_from_start_km || 0;
      
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Route must have either waypoint groups or at least 2 manual stops'
      });
    }
    
    // Auto-generate route_id
    const count = await BusRoute.countDocuments();
    const route_id = `ROUTE_${String(count + 1).padStart(3, '0')}`;
    
    const route = new BusRoute({
      route_id,
      route_name,
      description,
      waypoint_groups: waypoint_groups || [],
      stops: finalStops,
      total_distance_km,
      estimated_duration_hours: estimated_duration_hours || 0,
      assigned_buses: assigned_buses || [],
      is_active: true
    });
    
    await route.save();
    
    res.json({
      status: 'success',
      message: 'Route created successfully',
      route: route
    });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create route',
      error: error.message
    });
  }
};

// @desc    Update bus route
// @route   PUT /api/bus-routes/:route_id
// @access  Private
const updateBusRoute = async (req, res) => {
  try {
    const updates = { ...req.body };
    updates.updated_at = new Date();
    
    delete updates.route_id;
    
    if (updates.waypoint_groups && updates.waypoint_groups.length > 0) {
      let finalStops = [];
      let stopOrder = 1;
      let cumulativeDistance = 0;
      
      const sortedGroups = updates.waypoint_groups.sort((a, b) => a.order - b.order);
      
      for (const groupRef of sortedGroups) {
        const group = await WaypointGroup.findOne({ group_id: groupRef.group_id });
        
        if (group) {
          for (const waypoint of group.waypoints) {
            finalStops.push({
              stop_name: waypoint.name,
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
              stop_order: stopOrder++,
              distance_from_start_km: cumulativeDistance
            });
            cumulativeDistance += 10;
          }
        }
      }
      
      updates.stops = finalStops;
      updates.total_distance_km = cumulativeDistance;
      
    } else if (updates.stops && updates.stops.length > 0) {
      const sortedStops = updates.stops.sort((a, b) => a.stop_order - b.stop_order);
      updates.stops = sortedStops;
      updates.total_distance_km = sortedStops[sortedStops.length - 1].distance_from_start_km || 0;
    }
    
    const route = await BusRoute.findOneAndUpdate(
      { route_id: req.params.route_id },
      { $set: updates },
      { new: true }
    );
    
    if (!route) {
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Route updated successfully',
      route: route
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update route',
      error: error.message
    });
  }
};

// @desc    Delete/Deactivate bus route
// @route   DELETE /api/bus-routes/:route_id
// @access  Private
const deleteBusRoute = async (req, res) => {
  try {
    // Hard delete - permanently remove from database
    const route = await BusRoute.findOneAndDelete({ route_id: req.params.route_id });
    
    if (!route) {
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Route deleted permanently'
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete route',
      error: error.message
    });
  }
};

// @desc    Get bus route statistics
// @route   GET /api/bus-routes/stats/summary
// @access  Private
const getStats = async (req, res) => {
  try {
    const total = await BusRoute.countDocuments();
    const active = await BusRoute.countDocuments({ is_active: true });
    const inactive = await BusRoute.countDocuments({ is_active: false });
    
    const routes = await BusRoute.find({ is_active: true });
    const totalStops = routes.reduce((sum, route) => sum + route.stops.length, 0);
    
    res.json({
      status: 'success',
      stats: {
        total,
        active,
        inactive,
        totalStops
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = {
  getBusRoutes,
  getBusRouteById,
  createBusRoute,
  updateBusRoute,
  deleteBusRoute,
  getStats
};
