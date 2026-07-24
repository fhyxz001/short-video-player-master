const fs = require('fs-extra');
const path = require('path');

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.strm'];

function isHttpUrl(str) {
  return /^https?:\/\//i.test(str);
}

function readStrmUrl(filePath) {
  try {
    const content = require('fs').readFileSync(filePath, 'utf8').trim();
    if (!content) return null;
    const firstLine = content.split('\n')[0].trim();
    return firstLine || null;
  } catch (e) {
    console.error(`Error reading strm file ${filePath}:`, e.message);
    return null;
  }
}

// Seeded random number generator (Mulberry32)
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function shuffleArray(array, seed) {
  // Ensure seed is an integer
  const s = parseInt(seed) || 0;
  const rng = mulberry32(s);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getFilesRecursively(dir) {
  let results = [];
  try {
    const list = await fs.readdir(dir);
    for (const file of list) {
      // Skip hidden files/dirs and node_modules
      if (file.startsWith('.') || file === 'node_modules') continue;

      const filePath = path.join(dir, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(await getFilesRecursively(filePath));
        } else {
          results.push(filePath);
        }
      } catch (e) {
        // Ignore access errors
      }
    }
  } catch (e) {
    // Ignore readdir errors
  }
  return results;
}

async function getVideos(directoryPath, page = 1, limit = 10, seed = null) {
  try {
    if (!await fs.pathExists(directoryPath)) {
      console.error(`Directory not found: ${directoryPath}`);
      return { videos: [], total: 0, hasMore: false };
    }

    // Get all files recursively
    let allFiles = await getFilesRecursively(directoryPath);

    // Collect entries (regular videos + strm files)
    let entries = [];

    for (const filePath of allFiles) {
      const ext = path.extname(filePath).toLowerCase();
      if (!VIDEO_EXTENSIONS.includes(ext)) continue;

      const relPath = path.relative(directoryPath, filePath);
      const normalizedPath = relPath.split(path.sep).join('/');

      if (ext === '.strm') {
        // Read the target URL from the strm file
        const targetUrl = readStrmUrl(filePath);
        if (!targetUrl) continue;

        const strmName = path.basename(filePath, '.strm');

        if (isHttpUrl(targetUrl)) {
          // Remote URL — browser's <video> tag plays it directly
          entries.push({
            name: strmName,
            url: targetUrl,
            _sortPath: normalizedPath
          });
        } else {
          // Local file path — resolve relative to strm file and serve via /videos/
          const strmDir = path.dirname(filePath);
          const resolvedPath = path.resolve(strmDir, targetUrl);
          const resolvedDir = path.resolve(directoryPath);

          // Security: reject paths outside the configured directory
          if (!resolvedPath.startsWith(resolvedDir)) {
            console.error(`Security: strm file ${filePath} points outside localPath`);
            continue;
          }

          if (!await fs.pathExists(resolvedPath)) continue;

          const targetRelPath = path.relative(directoryPath, resolvedPath);
          const normalizedTarget = targetRelPath.split(path.sep).join('/');

          entries.push({
            name: strmName,
            url: `/videos/${encodeURIComponent(normalizedTarget)}`,
            _sortPath: normalizedPath
          });
        }
      } else {
        // Regular video file
        entries.push({
          name: normalizedPath,
          url: `/videos/${encodeURIComponent(normalizedPath)}`,
          _sortPath: normalizedPath
        });
      }
    }

    // Sort by the original file path (strm files sorted by their .strm path, not the target)
    entries.sort((a, b) => a._sortPath.localeCompare(b._sortPath, undefined, { numeric: true, sensitivity: 'base' }));

    // If seed is provided, shuffle the sorted list
    if (seed !== null && seed !== undefined) {
      shuffleArray(entries, seed);
    }

    const total = entries.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);

    const paginatedEntries = entries.slice(startIndex, endIndex);

    // Strip internal _sortPath property
    const videos = paginatedEntries.map(({ _sortPath, ...rest }) => rest);

    return {
      videos,
      total,
      hasMore: endIndex < total
    };
  } catch (error) {
    console.error('Error reading local videos:', error);
    return { videos: [], total: 0, hasMore: false };
  }
}

async function deleteVideo(directoryPath, filename) {
  try {
    const filePath = path.join(directoryPath, filename);
    
    // Security check: ensure the resolved path is within the directoryPath
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(directoryPath);
    
    if (!resolvedPath.startsWith(resolvedDir)) {
      throw new Error('Invalid file path');
    }

    if (!await fs.pathExists(filePath)) {
      throw new Error('File not found');
    }

    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
}

module.exports = {
  getVideos,
  deleteVideo
};
