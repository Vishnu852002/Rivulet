import React from 'react';
import { Trash2, ClipboardList, Download, Clock, CheckCircle } from 'lucide-react';
import QueueItem from '../components/QueueItem';

export default function Queue({ queue, onClearCompleted, onCancel, onRemove, onStartQueue, onPause, onResume, speedUnit }) {
  const hasWaiting = queue.some(i => i.status === 'waiting');
  const hasCompleted = queue.some(i => i.status === 'done' || i.status === 'failed');
  const downloading = queue.filter(i => i.status === 'downloading').length;
  const waiting = queue.filter(i => i.status === 'waiting').length;
  const paused = queue.filter(i => i.status === 'paused').length;
  const done = queue.filter(i => i.status === 'done').length;

  return (
    <div>
      <div className="flex-between mb-lg">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Download Queue</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasCompleted && (
            <button className="btn btn-secondary btn-sm" onClick={onClearCompleted}>
              <Trash2 size={16} /> Clear Completed
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {queue.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 24,
          marginBottom: 20,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}>
          {downloading > 0 && <span style={{ color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> {downloading} downloading</span>}
          {paused > 0 && <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {paused} paused</span>}
          {waiting > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {waiting} waiting</span>}
          {done > 0 && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> {done} completed</span>}
        </div>
      )}

      {/* Queue items */}
      {queue.length > 0 ? (
        queue.map(item => (
          <QueueItem
            key={item.queueId}
            item={item}
            onCancel={onCancel}
            onRemove={onRemove}
            onPause={onPause}
            onResume={onResume}
            speedUnit={speedUnit}
          />
        ))
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><ClipboardList size={32} /></div>
          <div className="empty-title">Your queue is empty</div>
          <div className="empty-state-sub">Go to the Downloader tab and add some videos!</div>
        </div>
      )}
    </div>
  );
}
