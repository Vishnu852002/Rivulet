/**
 * setup-bin.js — Downloads yt-dlp.exe and ffmpeg.exe into bin/
 * Run with: node scripts/setup-bin.js
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');

function follow(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Rivulet-Setup' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return follow(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      resolve(res);
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise(async (resolve, reject) => {
    console.log(`  Downloading: ${url}`);
    const stream = fs.createWriteStream(dest);
    try {
      const res = await follow(url);
      const total = parseInt(res.headers['content-length'], 10) || 0;
      let downloaded = 0;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
        }
      });
      res.pipe(stream);
      stream.on('finish', () => {
        console.log('\n  ✓ Done');
        stream.close(resolve);
      });
    } catch (e) {
      fs.unlink(dest, () => {});
      reject(e);
    }
  });
}

async function main() {
  console.log('\n💧 Rivulet — Binary Setup\n');

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  // 1. yt-dlp
  const ytdlpPath = path.join(BIN_DIR, 'yt-dlp.exe');
  if (fs.existsSync(ytdlpPath)) {
    console.log('✓ yt-dlp.exe already exists, skipping.\n');
  } else {
    console.log('⬇ Downloading yt-dlp.exe...');
    await download(
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      ytdlpPath
    );
    console.log('');
  }

  // 2. ffmpeg
  const ffmpegPath = path.join(BIN_DIR, 'ffmpeg.exe');
  if (fs.existsSync(ffmpegPath)) {
    console.log('✓ ffmpeg.exe already exists, skipping.\n');
  } else {
    console.log('⬇ Downloading ffmpeg.exe...');
    console.log('  (This may take a minute — ffmpeg is ~100MB)\n');
    // Download the full zip, extract just ffmpeg.exe
    const zipUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
    const zipPath = path.join(BIN_DIR, 'ffmpeg-temp.zip');
    await download(zipUrl, zipPath);

    // Extract ffmpeg.exe from the zip
    console.log('  Extracting ffmpeg.exe from zip...');
    try {
      // Use PowerShell to extract
      execSync(`powershell -Command "` +
        `$zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, '\\\\')}'); ` +
        `$entry = $zip.Entries | Where-Object { $_.Name -eq 'ffmpeg.exe' } | Select-Object -First 1; ` +
        `[System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, '${ffmpegPath.replace(/\\/g, '\\\\')}', $true); ` +
        `$zip.Dispose()"`,
        { stdio: 'inherit' }
      );
      console.log('  ✓ Extracted ffmpeg.exe');
    } catch (e) {
      console.error('  ✗ Failed to extract. Please manually extract ffmpeg.exe from the zip.');
    }

    // Clean up zip
    try { fs.unlinkSync(zipPath); } catch {}
    console.log('');
  }

  console.log('🎉 Setup complete! You can now run: npm run dev\n');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
