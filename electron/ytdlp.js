const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Track all running child processes
const runningProcesses = new Map();
let processCounter = 0;

/**
 * Get the path to the yt-dlp binary
 */
function getYtdlpPath() {
  if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
    return path.join(__dirname, '..', 'bin', 'yt-dlp.exe');
  }
  return path.join(process.resourcesPath, 'bin', 'yt-dlp.exe');
}

/**
 * Get the path to the ffmpeg binary
 */
function getFfmpegPath() {
  if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
    return path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  }
  return path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
}

/**
 * Map common yt-dlp errors to friendly messages
 */
function mapError(stderr) {
  const errorMaps = [
    { pattern: /sign in to confirm your age/i, message: "This video is age-restricted and can't be downloaded." },
    { pattern: /video unavailable/i, message: "This video is unavailable or has been removed." },
    { pattern: /private video/i, message: "This is a private video — you'd need to be logged in to access it." },
    { pattern: /is not a valid url/i, message: "That doesn't look like a valid URL. Try pasting a YouTube link." },
    { pattern: /http error 429/i, message: "Too many requests — YouTube is rate-limiting you. Wait a minute and try again." },
    { pattern: /unable to download webpage/i, message: "Can't reach YouTube. Check your internet connection." },
    { pattern: /requested format not available/i, message: "The selected quality isn't available for this video. Try a different one." },
    { pattern: /urlopen error/i, message: "Can't connect to the internet. Check your network connection." },
    { pattern: /no video formats found/i, message: "Couldn't find any downloadable formats for this video." },
    { pattern: /copyright/i, message: "This video can't be downloaded due to copyright restrictions." },
    { pattern: /geo.?restrict/i, message: "This video isn't available in your region." },
    { pattern: /members.?only/i, message: "This video is for channel members only." },
    { pattern: /premium/i, message: "This video requires a YouTube Premium subscription." },
    { pattern: /live event will begin/i, message: "This is a scheduled live stream that hasn't started yet." },
  ];

  for (const { pattern, message } of errorMaps) {
    if (pattern.test(stderr)) {
      return message;
    }
  }

  // Try to extract a clean error message from yt-dlp's output
  const errorMatch = stderr.match(/ERROR:\s*(.+)/i);
  if (errorMatch) {
    return errorMatch[1].trim();
  }

  return "Something went wrong with the download. Please try again.";
}

/**
 * Fetch video/playlist metadata
 */
function fetchMetadata(url) {
  return new Promise((resolve, reject) => {
    const ytdlpPath = getYtdlpPath();
    const args = ['--dump-json', '--flat-playlist', '--no-warnings', url];
    
    let stdout = '';
    let stderr = '';

    const proc = spawn(ytdlpPath, args, {
      windowsHide: true,
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(mapError(stderr)));
        return;
      }

      try {
        // yt-dlp outputs one JSON per line for playlists
        const lines = stdout.trim().split('\n').filter(Boolean);
        const entries = lines.map(line => JSON.parse(line));
        
        if (entries.length === 1) {
          // Single video
          const info = entries[0];
          resolve({
            type: 'video',
            id: info.id,
            title: info.title || info.fulltitle || 'Unknown Title',
            thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : null),
            duration: info.duration || 0,
            uploader: info.uploader || info.channel || 'Unknown',
            url: url,
          });
        } else {
          // Playlist
          const playlistInfo = entries[0];
          resolve({
            type: 'playlist',
            title: playlistInfo.playlist_title || playlistInfo.title || 'Playlist',
            videoCount: entries.length,
            entries: entries.map((e, i) => ({
              id: e.id,
              title: e.title || `Video ${i + 1}`,
              thumbnail: e.thumbnail || (e.thumbnails && e.thumbnails.length > 0 ? e.thumbnails[e.thumbnails.length - 1].url : null),
              duration: e.duration || 0,
              uploader: e.uploader || e.channel || 'Unknown',
              url: e.url || e.webpage_url || `https://www.youtube.com/watch?v=${e.id}`,
            })),
            url: url,
          });
        }
      } catch (e) {
        reject(new Error("Couldn't read the video information. The URL might not be supported."));
      }
    });

    proc.on('error', (err) => {
      reject(new Error("Couldn't start yt-dlp. The application may be corrupted."));
    });
  });
}

/**
 * Build yt-dlp arguments for download
 */
function buildDownloadArgs(options) {
  const {
    format, quality, outputDir, outputPath, embedThumbnail,
    trimStart, trimEnd, url,
    // Advanced options
    subtitles, sponsorblock, embedMetadata, speedLimit, cookiesBrowser,
  } = options;
  const ffmpegPath = getFfmpegPath();
  const args = [];

  // FFmpeg location
  args.push('--ffmpeg-location', ffmpegPath);

  // No warnings cluttering output
  args.push('--no-warnings');

  // Force progress on new lines (critical for line-by-line parsing on Windows)
  args.push('--newline');

  // Progress template for machine-readable output.
  // Using _percent_str which outputs like "  5.2%" - we parse this in the handler.
  args.push('--progress-template', 'download:{"status":"downloading","percentage":"%(progress._percent_str)s","speed":"%(progress._speed_str)s","eta":"%(progress._eta_str)s","downloaded":"%(progress._downloaded_bytes_str)s","total":"%(progress._total_bytes_str)s"}');

  // Output template
  if (outputPath) {
    args.push('-o', outputPath);
  } else {
    args.push('-o', path.join(outputDir, '%(title)s.%(ext)s'));
  }

  // Format selection
  switch (format) {
    case 'mp3':
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      if (embedThumbnail) {
        args.push('--embed-thumbnail');
      }
      break;
    case 'm4a':
      args.push('-x', '--audio-format', 'm4a', '--audio-quality', '0');
      break;
    case 'aac':
      args.push('-x', '--audio-format', 'aac', '--audio-quality', '0');
      break;
    case 'flac':
      args.push('-x', '--audio-format', 'flac');
      break;
    case 'wav':
      args.push('-x', '--audio-format', 'wav');
      break;
    case 'opus':
      args.push('-x', '--audio-format', 'opus');
      break;
    case 'webm':
      if (quality && quality !== 'best') {
        args.push('-f', `bestvideo[height<=${quality}][ext=webm]+bestaudio[ext=webm]/best[height<=${quality}][ext=webm]/best`);
      } else {
        args.push('-f', 'bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best');
      }
      break;
    case 'mp4':
    default:
      if (quality && quality !== 'best') {
        args.push('-f', `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`);
      } else {
        args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
      }
      args.push('--merge-output-format', 'mp4');
      break;
  }

  // Trim / clip
  if (trimStart || trimEnd) {
    const start = trimStart || '0:00:00';
    const end = trimEnd || 'inf';
    args.push('--download-sections', `*${start}-${end}`);
  }

  // === Advanced Options ===

  // Subtitles
  if (subtitles && subtitles.enabled) {
    if (subtitles.autoGenerated) {
      args.push('--write-auto-subs');
    }
    args.push('--write-subs');
    if (subtitles.language && subtitles.language !== 'all') {
      args.push('--sub-langs', subtitles.language);
    } else if (subtitles.language === 'all') {
      args.push('--sub-langs', 'all');
    }
    if (subtitles.format) {
      args.push('--sub-format', subtitles.format);
      args.push('--convert-subs', subtitles.format);
    }
    if (subtitles.embed) {
      args.push('--embed-subs');
    }
  }

  // SponsorBlock
  if (sponsorblock && sponsorblock.enabled) {
    const cats = sponsorblock.categories || ['sponsor'];
    if (sponsorblock.action === 'remove') {
      args.push('--sponsorblock-remove', cats.join(','));
    } else {
      args.push('--sponsorblock-mark', cats.join(','));
    }
  }

  // Embed metadata
  if (embedMetadata) {
    args.push('--embed-metadata');
    // Also embed thumbnail for all formats (not just mp3)
    args.push('--embed-thumbnail');
  }

  // Speed limit
  if (speedLimit) {
    args.push('--limit-rate', speedLimit);
  }

  // Cookies from browser
  if (cookiesBrowser && cookiesBrowser !== 'none') {
    args.push('--cookies-from-browser', cookiesBrowser);
  }

  args.push(url);
  return args;
}

/**
 * Start a download and stream progress
 */
function startDownload(options, onProgress, onComplete, onError) {
  const ytdlpPath = getYtdlpPath();
  const args = buildDownloadArgs(options);
  const id = ++processCounter;

  const proc = spawn(ytdlpPath, args, {
    windowsHide: true,
  });

  runningProcesses.set(id, proc);

  let stderr = '';
  let lastFilePath = '';

  proc.stdout.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n').filter(Boolean);

    for (const line of lines) {
      const trimmed = line.trim();
      // Try to parse JSON progress
      if (trimmed.startsWith('{') && trimmed.includes('"status"')) {
        try {
          // Clean potential ANSI codes
          let cleaned = trimmed.replace(/\x1b\[[0-9;]*m/g, '').trim();

          const progress = JSON.parse(cleaned);
          // percentage comes as a string like "  5.2%" or "100.0%"
          const pctNum = parseFloat(String(progress.percentage).replace('%', '').trim()) || 0;
          onProgress({
            id,
            percentage: pctNum,
            speed: String(progress.speed || 'N/A').trim(),
            eta: String(progress.eta || 'N/A').trim(),
            downloaded: String(progress.downloaded || '').trim(),
            total: String(progress.total || '').trim(),
          });
        } catch (e) {
          // Ignore parse errors for progress lines
        }
      }

      // Detect destination file from yt-dlp output
      // Matches:
      // [download] Destination: file.mp4
      // [Merger] Merging formats into "file.mp4"
      // [ExtractAudio] Destination: file.mp3
      // [FixupM4a] Destination: file.m4a
      const destMatch = line.match(/\[(?:Merger|download|ExtractAudio|Fixup[a-zA-Z]*)\].*?(?:Destination|Merging formats into|Merging into|Post-processed into):?\s*(.+)/i);
      if (destMatch) {
        lastFilePath = destMatch[1].trim().replace(/"/g, '');
      }
    }
  });

  proc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  proc.on('close', (code) => {
    runningProcesses.delete(id);
    if (code === 0) {
      // Try to determine the output file path
      if (!lastFilePath) {
        // Fallback: find most recently modified file in output directory
        try {
          const files = fs.readdirSync(options.outputDir)
            .map(f => ({
              name: f,
              path: path.join(options.outputDir, f),
              time: fs.statSync(path.join(options.outputDir, f)).mtimeMs,
            }))
            .sort((a, b) => b.time - a.time);
          if (files.length > 0) {
            lastFilePath = files[0].path;
          }
        } catch (e) {}
      }
      onComplete({ id, filePath: lastFilePath });
    } else {
      onError({ id, message: mapError(stderr) });
    }
  });

  proc.on('error', (err) => {
    runningProcesses.delete(id);
    onError({ id, message: "Couldn't start yt-dlp. The application may be corrupted." });
  });

  return id;
}

/**
 * Cancel a download
 */
function cancelDownload(id) {
  const proc = runningProcesses.get(id);
  if (proc) {
    proc.kill('SIGTERM');
    runningProcesses.delete(id);
    return true;
  }
  return false;
}

/**
 * Kill all running processes
 */
function killAll() {
  for (const [id, proc] of runningProcesses) {
    try {
      proc.kill('SIGTERM');
    } catch (e) {}
  }
  runningProcesses.clear();
}

/**
 * Get yt-dlp version
 */
function getVersion() {
  return new Promise((resolve, reject) => {
    const ytdlpPath = getYtdlpPath();
    const proc = spawn(ytdlpPath, ['--version'], { windowsHide: true });
    let stdout = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error('Could not get yt-dlp version'));
    });
    proc.on('error', () => reject(new Error('Could not run yt-dlp')));
  });
}

/**
 * Check for yt-dlp updates
 */
function checkForUpdate() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/yt-dlp/yt-dlp/releases/latest',
      headers: { 'User-Agent': 'YT-Downloader-App' },
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name;
          
          getVersion().then(currentVersion => {
            if (currentVersion !== latestVersion) {
              resolve({
                updateAvailable: true,
                currentVersion,
                latestVersion,
                downloadUrl: `https://github.com/yt-dlp/yt-dlp/releases/download/${latestVersion}/yt-dlp.exe`,
              });
            } else {
              resolve({
                updateAvailable: false,
                currentVersion,
                latestVersion,
              });
            }
          }).catch(() => {
            resolve({
              updateAvailable: true,
              currentVersion: 'unknown',
              latestVersion,
              downloadUrl: `https://github.com/yt-dlp/yt-dlp/releases/download/${latestVersion}/yt-dlp.exe`,
            });
          });
        } catch (e) {
          reject(new Error("Couldn't check for updates. Try again later."));
        }
      });
    }).on('error', () => {
      reject(new Error("Couldn't connect to GitHub. Check your internet connection."));
    });
  });
}

/**
 * Download and replace yt-dlp binary
 */
function downloadUpdate(downloadUrl) {
  return new Promise((resolve, reject) => {
    const ytdlpPath = getYtdlpPath();
    const tempPath = ytdlpPath + '.tmp';

    function doDownload(url) {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { headers: { 'User-Agent': 'YT-Downloader-App' } }, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doDownload(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(tempPath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          try {
            // Replace old binary
            if (fs.existsSync(ytdlpPath)) {
              fs.unlinkSync(ytdlpPath);
            }
            fs.renameSync(tempPath, ytdlpPath);
            resolve(true);
          } catch (e) {
            reject(new Error("Couldn't replace the old yt-dlp. It might be in use."));
          }
        });

        fileStream.on('error', (err) => {
          fs.unlinkSync(tempPath);
          reject(new Error("Download failed. Try again."));
        });
      }).on('error', () => {
        reject(new Error("Couldn't download the update. Check your internet."));
      });
    }

    doDownload(downloadUrl);
  });
}

module.exports = {
  fetchMetadata,
  startDownload,
  cancelDownload,
  killAll,
  getVersion,
  checkForUpdate,
  downloadUpdate,
  getYtdlpPath,
  getFfmpegPath,
};
