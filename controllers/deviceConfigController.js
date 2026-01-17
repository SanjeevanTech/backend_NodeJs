const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../device_config.json');

const getAllDeviceConfigs = (req, res) => {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return res.json({ default: { wifi_ssid: '', wifi_password: '', server_url: '' } });
        }
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const allConfigs = JSON.parse(configData);
        res.json({
            status: 'success',
            configs: allConfigs
        });
    } catch (error) {
        console.error('Error reading all device configs:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to read device configs'
        });
    }
};

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

        // SMART MERGE: Start with defaults, then overwrite with specific bus config if it exists
        const defaultConfig = allConfigs['default'] || {};
        const busConfig = allConfigs[bus_id] || {};
        
        // Merge them: Bus config wins, but missing fields come from default
        const mergedConfig = {
            ...defaultConfig,
            ...busConfig
        };

        res.json({
            status: 'success',
            bus_id: bus_id || 'default',
            ...mergedConfig
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

        // Validation: Only require bus_id
        if (!bus_id && bus_id !== 'default') {
             // If no bus_id, it might be a global update
        }

        let allConfigs = {};
        if (fs.existsSync(CONFIG_FILE)) {
            allConfigs = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }

        const targetBus = bus_id || 'default';
        
        // Update only the fields provided in the request
        const currentConfig = allConfigs[targetBus] || {};
        allConfigs[targetBus] = {
            wifi_ssid: wifi_ssid !== undefined ? wifi_ssid : currentConfig.wifi_ssid,
            wifi_password: wifi_password !== undefined ? wifi_password : currentConfig.wifi_password,
            server_url: server_url !== undefined ? server_url : currentConfig.server_url
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
    updateDeviceConfig,
    getAllDeviceConfigs
};
