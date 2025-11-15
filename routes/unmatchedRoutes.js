const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getUnmatched } = require('../controllers/unmatchedController');

// All routes are protected
router.use(verifyToken);

// @route   GET /api/unmatched
router.get('/', getUnmatched);

module.exports = router;
