# TikTok Media Downloader — GitHub + Render

## Files
- `server.js` — Express backend + API
- `public/index.html` — frontend
- `package.json` — Node dependencies
- `render.yaml` — Render configuration

## Render
1. Push all files to GitHub.
2. Render → New → Web Service.
3. Connect the GitHub repository.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy.

The app serves `public/index.html` at `/`, so the Render URL should no longer show `Cannot GET /`.

The project uses `yt-dlp-exec`, so a system-level `yt-dlp` installation is not required.

Use only public content you own or have permission to download.
