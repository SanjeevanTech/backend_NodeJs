const mongoose = require('mongoose');

const fareStageSchema = new mongoose.Schema({
  stage_number: {
    type: Number,
    required: true,
    unique: true
  },
  fare: {
    type: Number,
    required: true
  },
  distance_from_km: {
    type: Number,
    default: null
  },
  distance_to_km: {
    type: Number,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  updated_by: {
    type: String,
    default: 'admin'
  }
}, { collection: 'fareStages' });

// Calculate stage from distance
fareStageSchema.statics.calculateFare = async function(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return 0;
  
  // Each stage is approximately 3.5 km
  const STAGE_DISTANCE = 3.5;
  const stageNumber = Math.ceil(distanceKm / STAGE_DISTANCE);
  
  // Find the fare for this stage
  const fareStage = await this.findOne({ 
    stage_number: stageNumber,
    is_active: true 
  });
  
  if (fareStage) {
    return fareStage.fare;
  }
  
  // If exact stage not found, find the closest higher stage
  const closestStage = await this.findOne({
    stage_number: { $gte: stageNumber },
    is_active: true
  }).sort({ stage_number: 1 });
  
  if (closestStage) {
    return closestStage.fare;
  }
  
  // Fallback: use highest available stage
  const highestStage = await this.findOne({ is_active: true })
    .sort({ stage_number: -1 });
  
  return highestStage ? highestStage.fare : 0;
};

module.exports = mongoose.model('FareStage', fareStageSchema);
