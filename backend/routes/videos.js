const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const localFileService = require('../services/localFileService');

const CONFIG_PATH = path.join(__dirname, '../config/config.json');

router.get('/', async (req, res) => {
    try {
        const config = await fs.readJson(CONFIG_PATH);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const seed = req.query.seed; // Can be undefined/null

        // Default to local path if config exists
        const result = await localFileService.getVideos(config.localPath, page, limit, seed);
        res.json(result);
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

router.delete('/:filename', async (req, res) => {
    try {
        const config = await fs.readJson(CONFIG_PATH);
        const filename = req.params.filename;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        await localFileService.deleteVideo(config.localPath, filename);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

module.exports = router;
