const mongoose = require('mongoose');

const seasonTicketMemberSchema = new mongoose.Schema({
  member_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: String,
  email: String,
  
  // Face recognition data
  face_embedding: {
    type: [Number],
    required: true
  },
  embedding_size: Number,
  face_photo_url: String, // Optional: store photo reference
  
  // Season ticket details
  ticket_type: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  
  // Route restrictions
  valid_routes: [{
    from_location: String,      // e.g., "Jaffna"
    to_location: String,        // e.g., "Kodikamam"
    route_patterns: [String]    // e.g., ["Jaffna-Colombo", "Jaffna-Killinochchi"]
  }],
  
  // Validity period
  valid_from: {
    type: Date,
    required: true
  },
  valid_until: {
    type: Date,
    required: true
  },
  
  // Status
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Statistics
  total_trips: {
    type: Number,
    default: 0
  },
  last_used: Date,
  
  // Metadata
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { collection: 'seasonTicketMembers' });

// Index for fast face matching
seasonTicketMemberSchema.index({ is_active: 1, valid_from: 1, valid_until: 1 });
// Note: member_id index already created by unique: true

module.exports = mongoose.model('SeasonTicketMember', seasonTicketMemberSchema);
