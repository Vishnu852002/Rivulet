import React from 'react';
import { Film, User, Clock, ListVideo } from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoPreview({ metadata, loading }) {
  if (loading) {
    return (
      <div className="video-preview">
        <div className="video-thumbnail skeleton" style={{ width: 180, height: 100 }} />
        <div className="video-info">
          <div className="skeleton" style={{ width: '80%', height: 20, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '50%', height: 14 }} />
        </div>
      </div>
    );
  }

  if (!metadata) return null;

  const isPlaylist = metadata.type === 'playlist';

  return (
    <div className="video-preview">
      {metadata.thumbnail ? (
        <img
          className="video-thumbnail"
          src={metadata.thumbnail}
          alt={metadata.title}
          onError={(e) => { e.target.style.display = 'none'; }}
          onClick={() => metadata.original_url && window.electronAPI.openExternal(metadata.original_url)}
          style={{ cursor: metadata.original_url ? 'pointer' : 'default' }}
        />
      ) : (
        <div className="video-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Film size={32} />
        </div>
      )}
      <div className="video-info">
        <div 
          className="video-title" 
          onClick={() => metadata.original_url && window.electronAPI.openExternal(metadata.original_url)}
          style={{ cursor: metadata.original_url ? 'pointer' : 'default', textDecoration: metadata.original_url ? 'underline transparent' : 'none', transition: 'text-decoration 0.2s' }}
          onMouseOver={e => metadata.original_url && (e.target.style.textDecoration = 'underline')}
          onMouseOut={e => metadata.original_url && (e.target.style.textDecoration = 'underline transparent')}
        >
          {metadata.title}
        </div>
        <div className="video-meta">
          {metadata.uploader && <div className="video-meta-item"><User size={14} /> {metadata.uploader}</div>}
          {metadata.duration > 0 && <div className="video-meta-item"><Clock size={14} /> {formatDuration(metadata.duration)}</div>}
        </div>
        {isPlaylist && (
          <div style={{ marginTop: 12 }}>
            <span className="badge badge-accent">
              <ListVideo size={14} /> Playlist • {metadata.videoCount} videos
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
