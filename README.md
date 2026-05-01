<div align="center">

# 💧 Rivulet

### *A small stream carries everything you need.*

A sleek, elegant desktop app for downloading videos & audio from YouTube and **1000+ other sites**.  
Built with Electron, React, and the power of [yt-dlp](https://github.com/yt-dlp/yt-dlp).

[![Release](https://img.shields.io/github/v/release/Vishnu852002/Rivulet?style=for-the-badge&color=6366f1&label=Download)](https://github.com/Vishnu852002/Rivulet/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Vishnu852002/Rivulet?style=for-the-badge&color=f59e0b)](https://github.com/Vishnu852002/Rivulet/stargazers)

</div>

---

## ✨ Features

| Feature | Description |
|---------|------------|
| 🎬 **Video & Audio** | Download in MP4, WEBM, MP3, M4A, AAC, FLAC, WAV, Opus |
| 📊 **Quality Selection** | Choose from 360p to 4K |
| ✂️ **Trim / Clip** | Download only a specific portion of a video |
| 📝 **Subtitles** | Download & embed subtitles in 10+ languages (SRT, VTT, ASS) |
| 🚫 **SponsorBlock** | Auto-remove sponsors, intros, and outros from YouTube videos |
| 🏷️ **Embed Metadata** | Bake title, artist, and album art right into the file |
| 🍪 **Browser Cookies** | Access age-restricted & members-only content using your browser's login |
| 🐢 **Speed Limiter** | Cap download speed so you don't hog all the bandwidth |
| ⏸️ **Pause / Resume** | Pause downloads and pick up where you left off |
| 📂 **Save As** | Choose exactly where and what to name every download |
| 🌍 **1000+ Sites** | YouTube, Instagram, TikTok, Twitter/X, Vimeo, SoundCloud, and more |
| 🌙 **Dark / Light Mode** | Gorgeous premium UI with theme switching |
| 🔄 **Auto-Update Engine** | Update yt-dlp from within the app to keep downloads working |

## 📸 Screenshots

> *Coming soon — install and see for yourself!*

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Backend**: Electron (Node.js)
- **Download Engine**: [yt-dlp](https://github.com/yt-dlp/yt-dlp) (bundled)
- **Media Processing**: [FFmpeg](https://ffmpeg.org/) (bundled)
- **Installer**: electron-builder (NSIS)

## 📦 Installation

### Windows (Recommended)

1. Go to the [**Releases**](https://github.com/Vishnu852002/Rivulet/releases/latest) page
2. Download `Rivulet.Setup.x.x.x.exe`
3. Run the installer — that's it!

> ⚠️ **Note**: Windows SmartScreen may show a warning since the app isn't code-signed yet. Click **"More info" → "Run anyway"** to proceed.

### Build from Source

```bash
# Clone the repo
git clone https://github.com/Vishnu852002/Rivulet.git
cd Rivulet

# Install dependencies
npm install

# Download yt-dlp & ffmpeg binaries automatically
npm run setup

# Run in development mode
npm run dev

# Build the installer
npm run package
```

> **Prerequisites**: Node.js 18+ and npm. The `setup` script handles downloading yt-dlp and ffmpeg for you.

## 🗂️ Project Structure

```
├── electron/           # Electron main process
│   ├── main.js         # App window, IPC handlers
│   ├── preload.js      # Context bridge (renderer ↔ main)
│   └── ytdlp.js        # yt-dlp wrapper (download, metadata, update)
├── src/                # React frontend
│   ├── App.jsx         # Root component, state management, queue logic
│   ├── index.css       # Complete design system (dark/light themes)
│   ├── pages/          # Downloader, Queue, History, Settings
│   └── components/     # VideoPreview, QueueItem, ProgressBar
├── bin/                # Bundled binaries (yt-dlp.exe, ffmpeg.exe)
├── index.html          # Entry point
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies & build config
```

## 🤝 Contributing

Pull requests are welcome! If you find a bug or want a new feature, open an issue.

## 📄 License

MIT © [Vishnu852002](https://github.com/Vishnu852002)

---

<div align="center">

**If Rivulet saved you time, consider giving it a ⭐!**

Made with ❤️ by [Vishnu852002](https://github.com/Vishnu852002)

</div>
