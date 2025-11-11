const express = require('express');
const router = express.Router();
const FareStage = require('../models/FareStage');

// Get all fare stages
router.get('/stages', async (req, res) => {
  try {
    const stages = await FareStage.find({ is_active: true })
      .sort({ stage_number: 1 });
    
    res.json({
      status: 'success',
      total: stages.length,
      stages: stages
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch fare stages',
      error: error.message
    });
  }
});

// Get fare for specific distance
router.get('/calculate', async (req, res) => {
  try {
    const { distance } = req.query;
    
    if (!distance) {
      return res.status(400).json({
        status: 'error',
        message: 'Distance parameter required'
      });
    }
    
    const fare = await FareStage.calculateFare(parseFloat(distance));
    const stageNumber = Math.ceil(parseFloat(distance) / 3.5);
    
    res.json({
      status: 'success',
      distance_km: parseFloat(distance),
      stage_number: stageNumber,
      fare: fare
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to calculate fare',
      error: error.message
    });
  }
});

// Bulk import fare stages (for initial setup)
router.post('/stages/bulk', async (req, res) => {
  try {
    const { stages } = req.body;
    
    if (!stages || !Array.isArray(stages)) {
      return res.status(400).json({
        status: 'error',
        message: 'Stages array required'
      });
    }
    
    // Clear existing stages
    await FareStage.deleteMany({});
    
    // Insert new stages
    const result = await FareStage.insertMany(stages);
    
    res.json({
      status: 'success',
      message: `Imported ${result.length} fare stages`,
      count: result.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to import fare stages',
      error: error.message
    });
  }
});

// Update single fare stage
router.put('/stages/:stageNumber', async (req, res) => {
  try {
    const { stageNumber } = req.params;
    const { fare } = req.body;
    
    const updated = await FareStage.findOneAndUpdate(
      { stage_number: parseInt(stageNumber) },
      { 
        fare: fare,
        updated_at: new Date(),
        updated_by: req.body.updated_by || 'admin'
      },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: 'Stage not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Fare stage updated',
      stage: updated
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update fare stage',
      error: error.message
    });
  }
});

module.exports = router;
