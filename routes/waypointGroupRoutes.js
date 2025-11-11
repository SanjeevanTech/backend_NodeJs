const express = require('express');
const router = express.Router();
const WaypointGroup = require('../models/WaypointGroup');

// Get all waypoint groups
router.get('/', async (req, res) => {
  try {
    const { region, active_only } = req.query;
    
    let query = {};
    if (region) query.region = region;
    if (active_only === 'true') query.is_active = true;
    
    const groups = await WaypointGroup.find(query).sort({ group_name: 1 });
    
    res.json({
      status: 'success',
      total: groups.length,
      groups: groups
    });
  } catch (error) {
    console.error('Error fetching waypoint groups:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch waypoint groups',
      error: error.message
    });
  }
});

// Get single waypoint group
router.get('/:group_id', async (req, res) => {
  try {
    const group = await WaypointGroup.findOne({ group_id: req.params.group_id });
    
    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Waypoint group not found'
      });
    }
    
    res.json({
      status: 'success',
      group: group
    });
  } catch (error) {
    console.error('Error fetching waypoint group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch waypoint group',
      error: error.message
    });
  }
});

// Create new waypoint group
router.post('/', async (req, res) => {
  try {
    const { group_name, region, waypoints } = req.body;
    
    if (!group_name || !waypoints || waypoints.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Group name and at least 2 waypoints are required'
      });
    }
    
    // Auto-generate group_id
    const count = await WaypointGroup.countDocuments();
    const group_id = `WPG_${String(count + 1).padStart(3, '0')}`;
    
    // Sort waypoints by order
    const sortedWaypoints = waypoints.sort((a, b) => a.order - b.order);
    
    const group = new WaypointGroup({
      group_id,
      group_name,
      region,
      waypoints: sortedWaypoints,
      is_active: true
    });
    
    await group.save();
    
    res.json({
      status: 'success',
      message: 'Waypoint group created successfully',
      group: group
    });
  } catch (error) {
    console.error('Error creating waypoint group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create waypoint group',
      error: error.message
    });
  }
});

// Update waypoint group
router.put('/:group_id', async (req, res) => {
  try {
    const updates = { ...req.body };
    updates.updated_at = new Date();
    
    delete updates.group_id;
    
    if (updates.waypoints && updates.waypoints.length > 0) {
      updates.waypoints = updates.waypoints.sort((a, b) => a.order - b.order);
    }
    
    const group = await WaypointGroup.findOneAndUpdate(
      { group_id: req.params.group_id },
      { $set: updates },
      { new: true }
    );
    
    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Waypoint group not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Waypoint group updated successfully',
      group: group
    });
  } catch (error) {
    console.error('Error updating waypoint group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update waypoint group',
      error: error.message
    });
  }
});

// Delete/Deactivate waypoint group
router.delete('/:group_id', async (req, res) => {
  try {
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      const group = await WaypointGroup.findOneAndDelete({ group_id: req.params.group_id });
      
      if (!group) {
        return res.status(404).json({
          status: 'error',
          message: 'Waypoint group not found'
        });
      }
      
      res.json({
        status: 'success',
        message: 'Waypoint group permanently deleted'
      });
    } else {
      const group = await WaypointGroup.findOneAndUpdate(
        { group_id: req.params.group_id },
        { $set: { is_active: false, updated_at: new Date() } },
        { new: true }
      );
      
      if (!group) {
        return res.status(404).json({
          status: 'error',
          message: 'Waypoint group not found'
        });
      }
      
      res.json({
        status: 'success',
        message: 'Waypoint group deactivated',
        group: group
      });
    }
  } catch (error) {
    console.error('Error deleting waypoint group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete waypoint group',
      error: error.message
    });
  }
});

module.exports = router;
