import React from 'react';
import { Film, X, AlertCircle, Pause, Play, Trash2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

const FORMAT_LABELS = {
  mp4: 'MP4', mp3: 'MP3', m4a: 'M4A', webm: 'WEBM',
  aac: 'AAC', flac: 'FLAC', wav: 'WAV', opus: 'OPUS',
};

export default function QueueItem({ item, onCancel, onRemove, onPause, onResume, speedUnit }) {
  const statusMap = {
    waiting: { label: 'Waiting', className: 'status-waiting' },
    downloading: { label: 'Downloading', className: 'status-downloading' },
    paused: { label: 'Paused', className: 'status-waiting' },
    done: { label: 'Done', className: 'status-done' },
    failed: { label: 'Failed', className: 'status-failed' },
  };

  const status = statusMap[item.status] || statusMap.waiting;
  const isAudio = ['mp3', 'm4a', 'aac', 'flac', 'wav', 'opus'].includes(item.format);

  return (
    <div className="list-item">
      {item.thumbnail ? (
        <img className="list-item-thumb" src={item.thumbnail} alt="" onError={e => e.target.style.display = 'none'} />
      ) : (
        <div className="list-item-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Film size={24} /></div>
      )}
      <div className="list-item-content">
        <div 
          className="list-item-title"
          onClick={() => item.url && window.electronAPI.openExternal(item.url)}
          style={{ cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseOver={e => e.target.style.color = 'var(--accent-light)'}
          onMouseOut={e => e.target.style.color = ''}
        >
          {item.title || 'Untitled'}
        </div>
        <div className="list-item-meta">
          <span className="badge badge-outline">{FORMAT_LABELS[item.format] || item.format?.toUpperCase()}</span>
          {item.quality && item.quality !== 'best' && !isAudio && (
            <span>{item.quality}p</span>
          )}
        </div>
        {item.status === 'downloading' && (
          <ProgressBar
            percentage={item.progress}
            speed={item.speed}
            eta={item.eta}
            speedUnit={speedUnit}
          />
        )}
        {item.status === 'paused' && (
          <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Pause size={14} /> Paused at {(item.progress || 0).toFixed(1)}%
          </div>
        )}
        {item.status === 'failed' && item.error && (
          <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={14} /> {item.error}
          </div>
        )}
      </div>
      <div className="list-item-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`status-dot ${status.className}`} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, width: 80 }}>{status.label}</span>
        </div>
        
        {item.status === 'downloading' && (
          <button className="btn-icon" onClick={() => onPause(item.queueId)} title="Pause">
            <Pause size={16} />
          </button>
        )}
        {item.status === 'paused' && (
          <button className="btn-icon" onClick={() => onResume(item.queueId)} title="Resume" style={{ color: 'var(--success)' }}>
            <Play size={16} />
          </button>
        )}
        {item.status === 'downloading' && (
          <button className="btn btn-danger btn-sm" onClick={() => onCancel(item.queueId)}>
            Cancel
          </button>
        )}
        {(item.status === 'done' || item.status === 'failed' || item.status === 'paused' || item.status === 'waiting') && (
          <button className="btn-icon" onClick={() => onRemove(item.queueId)} title="Remove">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
