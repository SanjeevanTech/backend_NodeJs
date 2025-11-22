const SeasonTicketMember = require('../models/SeasonTicketMember');

// @desc    Get all season ticket members
// @route   GET /api/season-ticket/members
// @access  Private
const getMembers = async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = {};
    if (active_only === 'true') {
      const now = new Date();
      query = {
        is_active: true,
        valid_from: { $lte: now },
        valid_until: { $gte: now }
      };
    }
    
    const members = await SeasonTicketMember.find(query)
      .select('-face_embedding')
      .sort({ created_at: -1 });
    
    res.json({
      status: 'success',
      total: members.length,
      members: members
    });
  } catch (error) {
    console.error('Error fetching season ticket members:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch members',
      error: error.message
    });
  }
};

// @desc    Get single member by ID
// @route   GET /api/season-ticket/members/:member_id
// @access  Private
const getMemberById = async (req, res) => {
  try {
    const member = await SeasonTicketMember.findOne({ 
      member_id: req.params.member_id 
    });
    
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found'
      });
    }
    
    res.json({
      status: 'success',
      member: member
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch member',
      error: error.message
    });
  }
};

// @desc    Create new season ticket member
// @route   POST /api/season-ticket/members
// @access  Private
const createMember = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      face_embedding,
      embedding_size,
      ticket_type,
      valid_routes,
      valid_from,
      valid_until,
      from_location,
      to_location
    } = req.body;
    
    if (!name || !face_embedding || !valid_from || !valid_until) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, face_embedding, valid_from, valid_until'
      });
    }
    
    // Auto-generate member_id
    const count = await SeasonTicketMember.countDocuments();
    const member_id = `ST${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;
    
    console.log(`✅ Auto-generated Member ID: ${member_id}`);
    
    const member = new SeasonTicketMember({
      member_id,
      name,
      phone,
      email,
      face_embedding,
      embedding_size: embedding_size || face_embedding.length,
      ticket_type: ticket_type || 'monthly',
      valid_routes: valid_routes || [],
      valid_from: new Date(valid_from),
      valid_until: new Date(valid_until),
      is_active: true
    });
    
    await member.save();
    
    res.json({
      status: 'success',
      message: 'Season ticket member created successfully',
      member: member
    });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create member',
      error: error.message
    });
  }
};

// @desc    Update season ticket member
// @route   PUT /api/season-ticket/members/:member_id
// @access  Private
const updateMember = async (req, res) => {
  try {
    const updates = { ...req.body };
    updates.updated_at = new Date();
    
    delete updates.member_id;
    
    const member = await SeasonTicketMember.findOneAndUpdate(
      { member_id: req.params.member_id },
      { $set: updates },
      { new: true }
    );
    
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Member updated successfully',
      member: member
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update member',
      error: error.message
    });
  }
};

// @desc    Delete/Deactivate season ticket member
// @route   DELETE /api/season-ticket/members/:member_id
// @access  Private
const deleteMember = async (req, res) => {
  try {
    // Hard delete - permanently remove from database
    const member = await SeasonTicketMember.findOneAndDelete({ 
      member_id: req.params.member_id 
    });
    
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Member deleted permanently'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete member',
      error: error.message
    });
  }
};

// @desc    Get member statistics
// @route   GET /api/season-ticket/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const now = new Date();
    
    const total = await SeasonTicketMember.countDocuments();
    const active = await SeasonTicketMember.countDocuments({
      is_active: true,
      valid_from: { $lte: now },
      valid_until: { $gte: now }
    });
    const expired = await SeasonTicketMember.countDocuments({
      valid_until: { $lt: now }
    });
    const upcoming = await SeasonTicketMember.countDocuments({
      valid_from: { $gt: now }
    });
    
    res.json({
      status: 'success',
      stats: {
        total,
        active,
        expired,
        upcoming
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
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getStats
};
