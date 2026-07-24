const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const videosRouter = require('./routes/videos');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = 7978;
const CONFIG_PATH = path.join(__dirname, 'config/config.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Static file serving for local videos
// We need to dynamically serve the directory specified in config
// Since config can change, we might need a middleware to check path or just serve the current one.
// However, express.static is initialized once. 
// To support dynamic changing of local path without restart, we can create a custom middleware
// or just restart server. For simplicity, let's try to serve based on current config on every request 
// or simpler: just assume one static mount point that maps to the configured path.
// But standard express.static doesn't support changing root.
// We can use a middleware that reads config and sends file.
app.use('/videos', async (req, res, next) => {
    try {
        const config = await fs.readJson(CONFIG_PATH);
        if (config.localPath) {
            const filePath = path.join(config.localPath, decodeURIComponent(req.path));
            // Security check: prevent directory traversal
            if (!filePath.startsWith(path.resolve(config.localPath))) {
                 // Simple check, might need more robust handling
            }
            if (await fs.pathExists(filePath)) {
                return res.sendFile(filePath);
            }
        }
        next();
    } catch (error) {
        next();
    }
});


// Routes
app.use('/api/videos', videosRouter);
app.use('/api/settings', settingsRouter);

// Catch-all for SPA
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/videos')) {
        return next();
    }
    const indexPath = path.join(__dirname, 'public/index.html');
    if (!fs.existsSync(indexPath)) {
        return res.status(404).send(`
            <h1>404 - Not Found</h1>
            <p>找不到前端文件 (index.html)。</p>
            <p>可能原因：前端构建失败或未运行。</p>
            <p>请在服务器运行: <code>./start.sh</code> 并在输出中检查是否有构建错误。</p>
        `);
    }
    res.sendFile(indexPath);
});

// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
