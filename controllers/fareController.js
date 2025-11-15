const FareStage = require('../models/FareStage');

// @desc    Get all fare stages
// @route   GET /api/fare/stages
// @access  Private
const getFareStages = async (req, res) => {
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
};

// @desc    Calculate fare for specific distance
// @route   GET /api/fare/calculate
// @access  Private
const calculateFare = async (req, res) => {
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
};

// @desc    Bulk import fare stages
// @route   POST /api/fare/stages/bulk
// @access  Private
const bulkImportFareStages = async (req, res) => {
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
};

// @desc    Update single fare stage
// @route   PUT /api/fare/stages/:stageNumber
// @access  Private
const updateFareStage = async (req, res) => {
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
};

module.exports = {
  getFareStages,
  calculateFare,
  bulkImportFareStages,
  updateFareStage
};
