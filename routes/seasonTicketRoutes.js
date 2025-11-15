const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getStats
} = require('../controllers/seasonTicketController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/season-ticket/stats
router.get('/stats', getStats);

// @route   GET /api/season-ticket/members
router.get('/members', getMembers);

// @route   GET /api/season-ticket/members/:member_id
router.get('/members/:member_id', getMemberById);

// @route   POST /api/season-ticket/members
router.post('/members', createMember);

// @route   PUT /api/season-ticket/members/:member_id
router.put('/members/:member_id', updateMember);

// @route   DELETE /api/season-ticket/members/:member_id
router.delete('/members/:member_id', deleteMember);

module.exports = router;
