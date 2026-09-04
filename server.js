const express = require('express');
const cors = require('cors');
const path = require('path');
const { execFile } = require('child_process');
const ytDlpBin = require('yt-dlp-exec').path;

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// IMPORTANT: index.html is inside /public
app.use(express.static(path.join(__dirname, 'public')));

const formats = {
  ultra: 'best[height<=2160]/best',
  '1080': 'best[height<=1080]/best',
  '780': 'best[height<=780]/best',
  hd: 'best[height<=720]/best'
};

function validTikTokUrl(value) {
  try {
    const u = new URL(value);
    return /(^|\\.)tiktok\\.com$/i.test(u.hostname) || /(^|\\.)vm\.tiktok\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function ytDlp(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(ytDlpBin, args, {
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
      ...options
    }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr?.trim() || error.message));
      resolve(stdout);
    });
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'tiktok-media-downloader' });
});

app.get('/api/info', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!validTikTokUrl(url)) {
    return res.status(400).json({ success: false, message: 'Valid TikTok URL required.' });
  }

  try {
    const output = await ytDlp([
      '--no-playlist',
      '--no-warnings',
      '--dump-single-json',
      '--skip-download',
      url
    ]);

    const info = JSON.parse(output);
    res.json({
      success: true,
      title: info.title || 'TikTok Media',
      thumbnail: info.thumbnail || '',
      uploader: info.uploader || '',
      duration: info.duration || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not read TikTok media. Try another public TikTok URL.' });
  }
});

app.post('/api/download', async (req, res) => {
  const url = String(req.body?.url || '').trim();
  const quality = String(req.body?.quality || '1080');

  if (!validTikTokUrl(url)) {
    return res.status(400).json({ success: false, message: 'Valid TikTok URL required.' });
  }

  const format = formats[quality] || formats['1080'];

  try {
    const output = await ytDlp([
      '--no-playlist',
      '--no-warnings',
      '--get-url',
      '-f', format,
      url
    ]);

    const lines = output.trim().split(/\r?\n/).filter(Boolean);
    const downloadUrl = lines[lines.length - 1];

    if (!downloadUrl || !/^https?:\/\//i.test(downloadUrl)) {
      throw new Error('No media URL returned');
    }

    res.json({
      success: true,
      type: 'video',
      quality,
      download_url: downloadUrl
    });
  } catch (error) {
    console.error('yt-dlp error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Could not resolve this TikTok video. The video may be private, unavailable, or temporarily blocked.'
    });
  }
});

// SPA/root fallback. This fixes "Cannot GET /".
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
  console.log(`Frontend: http://0.0.0.0:${PORT}/`);
});
