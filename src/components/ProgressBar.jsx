import React from 'react';

/**
 * Parse a speed string like "5.2MiB/s" or "1.3KiB/s" from yt-dlp
 * and convert to the user's preferred unit.
 */
function formatSpeed(rawSpeed, unit) {
  if (!rawSpeed || rawSpeed === 'N/A') return '';
  
  // yt-dlp outputs speeds like "5.23MiB/s", "512.3KiB/s", "1.2GiB/s"
  const match = rawSpeed.match(/([\d.]+)\s*(GiB|MiB|KiB|B)\/s/i);
  if (!match) return rawSpeed; // Can't parse, return as-is

  const value = parseFloat(match[1]);
  const suffix = match[2];

  // Convert to bytes/s first
  let bytesPerSec;
  switch (suffix) {
    case 'GiB': bytesPerSec = value * 1024 * 1024 * 1024; break;
    case 'MiB': bytesPerSec = value * 1024 * 1024; break;
    case 'KiB': bytesPerSec = value * 1024; break;
    default: bytesPerSec = value; break;
  }

  if (unit === 'Mbs') {
    // Megabits per second
    const mbps = (bytesPerSec * 8) / (1000 * 1000);
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gb/s`;
    if (mbps >= 1) return `${mbps.toFixed(1)} Mb/s`;
    return `${(mbps * 1000).toFixed(0)} Kb/s`;
  } else {
    // Megabytes per second (default)
    const MBps = bytesPerSec / (1024 * 1024);
    if (MBps >= 1024) return `${(MBps / 1024).toFixed(1)} GB/s`;
    if (MBps >= 1) return `${MBps.toFixed(1)} MB/s`;
    return `${(MBps * 1024).toFixed(0)} KB/s`;
  }
}

export default function ProgressBar({ percentage = 0, speed, eta, downloaded, total, speedUnit }) {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const displaySpeed = formatSpeed(speed, speedUnit);

  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <div className="progress-info">
        <span>{clampedPct.toFixed(1)}%{downloaded && total ? ` — ${downloaded} / ${total}` : ''}</span>
        <span>
          {displaySpeed ? displaySpeed : ''}
          {eta && eta !== 'N/A' ? ` • ETA: ${eta}` : ''}
        </span>
      </div>
    </div>
  );
}
