const express = require('express');
const router = express.Router();
const { getDeviceConfig, updateDeviceConfig, getAllDeviceConfigs } = require('../controllers/deviceConfigController');

// For simplicity as requested, these can be public or use a simple check
// GET is public so ESP32 can fetch it easily
router.get('/get', getDeviceConfig);
router.get('/all', getAllDeviceConfigs);

// POST should ideally be protected, but user wants "simple"
// We'll keep it public for now or assume they'll use it via Postman/Curl
router.post('/update', updateDeviceConfig);

module.exports = router;
