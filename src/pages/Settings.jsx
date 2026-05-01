import React, { useState, useEffect } from 'react';
import { Moon, Sun, RefreshCw, AlertCircle, CheckCircle, Info, Gauge, Cookie } from 'lucide-react';

const BROWSERS = [
  { value: 'none', label: 'None (default)' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'edge', label: 'Microsoft Edge' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'brave', label: 'Brave' },
  { value: 'opera', label: 'Opera' },
  { value: 'vivaldi', label: 'Vivaldi' },
];

export default function Settings({ theme, onToggleTheme, speedLimit, onSpeedLimitChange, cookiesBrowser, onCookiesBrowserChange, speedUnit, onSpeedUnitChange }) {
  const [ytdlpVersion, setYtdlpVersion] = useState('Loading...');
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [localSpeed, setLocalSpeed] = useState(speedLimit || '');

  useEffect(() => {
    window.electronAPI.getYtdlpVersion().then(result => {
      if (result.success) {
        setYtdlpVersion(result.version);
      } else {
        setYtdlpVersion('Unknown');
      }
    });
  }, []);

  useEffect(() => {
    setLocalSpeed(speedLimit || '');
  }, [speedLimit]);

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    try {
      const result = await window.electronAPI.checkForUpdate();
      if (result.success) {
        if (result.data.updateAvailable) {
          setUpdateStatus('available');
          setUpdateInfo(result.data);
        } else {
          setUpdateStatus('up-to-date');
        }
      } else {
        setUpdateStatus('error');
        setUpdateInfo({ error: result.error });
      }
    } catch (e) {
      setUpdateStatus('error');
      setUpdateInfo({ error: 'Failed to check for updates' });
    }
  };

  const handlePerformUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    setUpdateStatus('updating');
    try {
      const result = await window.electronAPI.performUpdate(updateInfo.downloadUrl);
      if (result.success) {
        setYtdlpVersion(result.version);
        setUpdateStatus('updated');
      } else {
        setUpdateStatus('error');
        setUpdateInfo({ error: result.error });
      }
    } catch (e) {
      setUpdateStatus('error');
      setUpdateInfo({ error: 'Update failed' });
    }
  };

  const handleSpeedBlur = () => {
    onSpeedLimitChange(localSpeed.trim() || '');
  };

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="card">
        {/* Theme */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name">Appearance</div>
            <div className="setting-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {theme === 'dark' ? <><Moon size={14} /> Dark mode is on</> : <><Sun size={14} /> Light mode is on</>}
            </div>
          </div>
          <button
            className={`switch ${theme === 'dark' ? 'active' : ''}`}
            onClick={onToggleTheme}
            id="theme-toggle"
            aria-label="Toggle theme"
          >
            <div className="switch-knob" />
          </button>
        </div>

        {/* Speed Limit */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gauge size={16} /> Max Download Speed
            </div>
            <div className="setting-desc">
              Limit bandwidth to avoid slowing down other activities. Examples: <code>5M</code> = 5 MB/s, <code>500K</code> = 500 KB/s
            </div>
          </div>
          <input
            className="form-input"
            type="text"
            value={localSpeed}
            onChange={e => setLocalSpeed(e.target.value)}
            onBlur={handleSpeedBlur}
            onKeyDown={e => e.key === 'Enter' && handleSpeedBlur()}
            placeholder="Unlimited"
            style={{ width: 120, textAlign: 'center' }}
          />
        </div>

        {/* Cookies from Browser */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cookie size={16} /> Use Cookies from Browser
            </div>
            <div className="setting-desc">
              Borrow your existing login session to access age-restricted or members-only content. No passwords are stored.
            </div>
          </div>
          <select
            className="form-select"
            value={cookiesBrowser || 'none'}
            onChange={e => onCookiesBrowserChange(e.target.value)}
            style={{ width: 180 }}
          >
            {BROWSERS.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>

        {/* Speed Unit Display */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gauge size={16} /> Speed Display Unit
            </div>
            <div className="setting-desc">
              How download speed is shown in the queue.
            </div>
          </div>
          <select
            className="form-select"
            value={speedUnit || 'MBs'}
            onChange={e => onSpeedUnitChange(e.target.value)}
            style={{ width: 140 }}
          >
            <option value="MBs">MB/s (bytes)</option>
            <option value="Mbs">Mb/s (bits)</option>
          </select>
        </div>

        {/* yt-dlp Version */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name">yt-dlp Version</div>
            <div className="setting-desc" style={{ marginBottom: 4 }}>{ytdlpVersion}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Updates the core download engine from GitHub. Essential if YouTube downloads start failing.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {updateStatus === 'checking' && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} style={{ animation: 'spin 2s linear infinite' }} /> Checking...
              </span>
            )}
            {updateStatus === 'up-to-date' && (
              <span style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> Up to date!
              </span>
            )}
            {updateStatus === 'available' && (
              <>
                <span style={{ fontSize: 13, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} /> {updateInfo?.latestVersion} available
                </span>
                <button className="btn btn-accent btn-sm" onClick={handlePerformUpdate}>
                  Update
                </button>
              </>
            )}
            {updateStatus === 'updating' && (
              <span style={{ fontSize: 13, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} style={{ animation: 'spin 2s linear infinite' }} /> Updating...
              </span>
            )}
            {updateStatus === 'updated' && (
              <span style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> Updated!
              </span>
            )}
            {updateStatus === 'error' && (
              <span style={{ fontSize: 13, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {updateInfo?.error}
              </span>
            )}
            {(!updateStatus || updateStatus === 'up-to-date' || updateStatus === 'error') && (
              <button className="btn btn-secondary btn-sm" onClick={handleCheckUpdate}>
                <RefreshCw size={14} /> Check for Update
              </button>
            )}
          </div>
        </div>

        {/* About */}
        <div className="setting-row" style={{ borderBottom: 'none' }}>
          <div className="setting-info">
            <div className="setting-name">About</div>
            <div className="setting-desc">
              Rivulet v1.0.0 — Powered by yt-dlp & ffmpeg
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
