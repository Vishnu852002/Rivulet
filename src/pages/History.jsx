import React, { useState } from 'react';
import { Trash2, Folder, Film } from 'lucide-react';

export default function History({ history, onClearHistory }) {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleOpenFolder = async (filePath) => {
    if (filePath) {
      await window.electronAPI.showItemInFolder(filePath);
    }
  };

  const formatDate = (isoDate) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div>
      <div className="flex-between mb-lg">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Download History</h1>
        {history.length > 0 && (
          <div>
            {confirmClear ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Are you sure?</span>
                <button className="btn btn-danger btn-sm" onClick={() => { onClearHistory(); setConfirmClear(false); }}>
                  Yes, clear all
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmClear(true)}>
                <Trash2 size={16} /> Clear History
              </button>
            )}
          </div>
        )}
      </div>

      {history.length > 0 ? (
        history.map((item, i) => (
          <div
            key={i}
            className="history-item"
            onClick={() => handleOpenFolder(item.filePath)}
            title={item.filePath ? `Click to open: ${item.filePath}` : ''}
          >
            {item.thumbnail ? (
              <img
                className="list-item-thumb"
                src={item.thumbnail}
                alt=""
                onError={e => e.target.style.display = 'none'}
                onClick={() => item.filePath && window.electronAPI.openPath(item.filePath)}
                style={{ cursor: item.filePath ? 'pointer' : 'default' }}
              />
            ) : (
              <div 
                className="list-item-thumb" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: item.filePath ? 'pointer' : 'default' }}
                onClick={() => item.filePath && window.electronAPI.openPath(item.filePath)}
              >
                <Film size={24} />
              </div>
            )}
            <div className="list-item-content">
              <div 
                className="list-item-title"
                onClick={() => item.filePath && window.electronAPI.openPath(item.filePath)}
                style={{ cursor: item.filePath ? 'pointer' : 'default', transition: 'color 0.2s' }}
                onMouseOver={e => item.filePath && (e.target.style.color = 'var(--accent-light)')}
                onMouseOut={e => item.filePath && (e.target.style.color = '')}
              >
                {item.title || 'Untitled'}
              </div>
              <div className="list-item-meta">{formatDate(item.date)}</div>
            </div>
            <div className="list-item-actions">
              {item.format && <span className="badge badge-outline">{item.format.toUpperCase()}</span>}
              <button 
                className="btn-icon" 
                onClick={() => item.filePath && window.electronAPI.showItemInFolder(item.filePath)}
                title="Show in Folder"
              >
                <Folder size={18} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Folder size={32} /></div>
          <div className="empty-title">No downloads yet</div>
          <div className="empty-state-sub">Your completed downloads will show up here</div>
        </div>
      )}
    </div>
  );
}
