const express = require('express');
const router = express.Router();
const SeasonTicketMember = require('../models/SeasonTicketMember');

// Get all season ticket members
router.get('/members', async (req, res) => {
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
      .select('-face_embedding') // Don't send embeddings in list view
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
});

// Get single member by ID
router.get('/members/:member_id', async (req, res) => {
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
});

// Create new season ticket member
router.post('/members', async (req, res) => {
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
    
    // Validate required fields
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
});

// Update season ticket member
router.put('/members/:member_id', async (req, res) => {
  try {
    const updates = { ...req.body };
    updates.updated_at = new Date();
    
    // Don't allow changing member_id
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
});

// Delete/Deactivate season ticket member
router.delete('/members/:member_id', async (req, res) => {
  try {
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      // Permanent deletion
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
        message: 'Member permanently deleted'
      });
    } else {
      // Soft delete (deactivate)
      const member = await SeasonTicketMember.findOneAndUpdate(
        { member_id: req.params.member_id },
        { $set: { is_active: false, updated_at: new Date() } },
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
        message: 'Member deactivated',
        member: member
      });
    }
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete member',
      error: error.message
    });
  }
});

// Get member statistics
router.get('/stats', async (req, res) => {
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
});

module.exports = router;
