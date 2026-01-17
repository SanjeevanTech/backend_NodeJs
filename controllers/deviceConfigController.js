const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../device_config.json');

// @desc    Get device configuration
// @route   GET /api/device-config/get
// @access  Public (or semi-protected)
const getDeviceConfig = (req, res) => {
    try {
        const { bus_id } = req.query;

        if (!fs.existsSync(CONFIG_FILE)) {
            return res.status(404).json({
                status: 'error',
                message: 'Configuration file not found'
            });
        }

        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const allConfigs = JSON.parse(configData);

        // Try to find config for specific bus, or fall back to default
        let config = allConfigs[bus_id] || allConfigs['default'];

        if (!config) {
            return res.status(404).json({
                status: 'error',
                message: 'No configuration found for this bus or default'
            });
        }

        res.json({
            status: 'success',
            bus_id: bus_id || 'default',
            ...config
        });
    } catch (error) {
        console.error('Error reading device config:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to read device config',
            error: error.message
        });
    }
};

// @desc    Update device configuration
// @route   POST /api/device-config/update
// @access  Private-ish (could be simplified for the user)
const updateDeviceConfig = (req, res) => {
    try {
        const { bus_id, wifi_ssid, wifi_password, server_url } = req.body;

        if (!wifi_ssid || !wifi_password || !server_url) {
            return res.status(400).json({
                status: 'error',
                message: 'wifi_ssid, wifi_password, and server_url are required'
            });
        }

        let allConfigs = {};
        if (fs.existsSync(CONFIG_FILE)) {
            allConfigs = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }

        const targetBus = bus_id || 'default';
        allConfigs[targetBus] = {
            wifi_ssid,
            wifi_password,
            server_url
        };

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(allConfigs, null, 2), 'utf8');

        res.json({
            status: 'success',
            message: `Configuration for ${targetBus} updated successfully`,
            config: allConfigs[targetBus]
        });
    } catch (error) {
        console.error('Error updating device config:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update device config',
            error: error.message
        });
    }
};

module.exports = {
    getDeviceConfig,
    updateDeviceConfig
};
