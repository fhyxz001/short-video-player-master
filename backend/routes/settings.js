const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/config.json');

router.get('/', async (req, res) => {
    try {
        const config = await fs.readJson(CONFIG_PATH);
        res.json(config);
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

router.post('/', async (req, res) => {
    try {
        const newConfig = req.body;
        // Basic validation could be added here
        await fs.writeJson(CONFIG_PATH, newConfig, { spaces: 2 });
        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
