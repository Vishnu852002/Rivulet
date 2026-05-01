import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DownloadCloud, List, History as HistoryIcon, Settings as SettingsIcon, PlaySquare } from 'lucide-react';
import Downloader from './pages/Downloader';
import Queue from './pages/Queue';
import History from './pages/History';
import Settings from './pages/Settings';

// Browser-safe mock for development outside Electron
if (!window.electronAPI) {
  window.electronAPI = {
    fetchMetadata: async () => ({ success: false, error: 'Running in browser — Electron API not available' }),
    startDownload: async () => ({ success: false, error: 'Not in Electron' }),
    cancelDownload: async () => false,
    onDownloadProgress: () => () => {},
    onDownloadComplete: () => () => {},
    onDownloadError: () => () => {},
    getYtdlpVersion: async () => ({ success: true, version: 'Browser Mock' }),
    checkForUpdate: async () => ({ success: false, error: 'Not in Electron' }),
    performUpdate: async () => ({ success: false }),
    storeGet: async (key) => {
      try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    },
    storeSet: async (key, value) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    selectFolder: async () => null,
    openPath: async () => {},
    showItemInFolder: async () => {},
    openExternal: async (url) => window.open(url, '_blank'),
    readClipboard: async () => { try { return await navigator.clipboard.readText(); } catch { return ''; } }
  };
}

const NAV_ITEMS = [
  { id: 'downloader', label: 'Downloader', icon: DownloadCloud },
  { id: 'queue', label: 'Queue', icon: List },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('downloader');
  const [theme, setTheme] = useState('dark');
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [speedLimit, setSpeedLimit] = useState('');
  const [cookiesBrowser, setCookiesBrowser] = useState('none');
  const [speedUnit, setSpeedUnit] = useState('MBs'); // 'MBs' or 'Mbs'

  // Load persisted state on mount
  useEffect(() => {
    async function loadState() {
      try {
        const savedTheme = await window.electronAPI.storeGet('theme');
        if (savedTheme) {
          setTheme(savedTheme);
          if (savedTheme === 'light') document.body.classList.add('light-mode');
        }
        const savedHistory = await window.electronAPI.storeGet('history');
        if (savedHistory) setHistory(savedHistory);
        const savedSpeed = await window.electronAPI.storeGet('speedLimit');
        if (savedSpeed) setSpeedLimit(savedSpeed);
        const savedCookies = await window.electronAPI.storeGet('cookiesBrowser');
        if (savedCookies) setCookiesBrowser(savedCookies);
        const savedUnit = await window.electronAPI.storeGet('speedUnit');
        if (savedUnit) setSpeedUnit(savedUnit);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
    loadState();
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.body.classList.toggle('light-mode', next === 'light');
    window.electronAPI.storeSet('theme', next);
  }, [theme]);

  // Change speed limit
  const changeSpeedLimit = useCallback((val) => {
    setSpeedLimit(val);
    window.electronAPI.storeSet('speedLimit', val);
  }, []);

  // Change cookies browser
  const changeCookiesBrowser = useCallback((val) => {
    setCookiesBrowser(val);
    window.electronAPI.storeSet('cookiesBrowser', val);
  }, []);

  // Change speed unit
  const changeSpeedUnit = useCallback((val) => {
    setSpeedUnit(val);
    window.electronAPI.storeSet('speedUnit', val);
  }, []);

  // Add to queue
  const addToQueue = useCallback((item) => {
    setQueue(prev => [...prev, {
      ...item,
      queueId: Date.now() + Math.random(),
      status: 'waiting',
      progress: 0,
      speed: '',
      eta: '',
      processId: null,
      error: null,
    }]);
  }, []);

  // Add to history
  const addToHistory = useCallback((item) => {
    setHistory(prev => {
      const updated = [{
        ...item,
        date: new Date().toISOString(),
      }, ...prev].slice(0, 200); // Keep last 200
      window.electronAPI.storeSet('history', updated);
      return updated;
    });
  }, []);

  // Clear completed from queue
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(i => i.status !== 'done' && i.status !== 'failed'));
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    window.electronAPI.storeSet('history', []);
  }, []);

  // Remove single queue item
  const removeFromQueue = useCallback((queueId) => {
    setQueue(prev => prev.filter(i => i.queueId !== queueId));
  }, []);

  // Listen to IPC events
  useEffect(() => {
    const offProgress = window.electronAPI.onDownloadProgress((data) => {
      setQueue(prev => prev.map(item => {
        if (item.processId === data.id) {
          return {
            ...item,
            progress: data.percentage || 0,
            speed: data.speed || '',
            eta: data.eta || '',
          };
        }
        return item;
      }));
    });

    const offComplete = window.electronAPI.onDownloadComplete((data) => {
      setQueue(prev => {
        const updated = prev.map(item => {
          if (item.processId === data.id) {
            const completed = {
              ...item,
              status: 'done',
              progress: 100,
              filePath: data.filePath,
            };
            // Add to history
            addToHistory({
              title: completed.title,
              thumbnail: completed.thumbnail,
              format: completed.format,
              filePath: data.filePath,
            });
            return completed;
          }
          return item;
        });
        return updated;
      });
      processingRef.current = false;
      setIsProcessing(false);
    });

    const offError = window.electronAPI.onDownloadError((data) => {
      setQueue(prev => prev.map(item => {
        if (item.processId === data.id) {
          return { ...item, status: 'failed', error: data.message };
        }
        return item;
      }));
      processingRef.current = false;
      setIsProcessing(false);
    });

    return () => {
      offProgress();
      offComplete();
      offError();
    };
  }, [addToHistory]);

  // Process queue sequentially
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;

    const nextItem = queue.find(i => i.status === 'waiting');
    if (!nextItem) return;

    processingRef.current = true;
    setIsProcessing(true);

    // Mark as downloading
    setQueue(prev => prev.map(i =>
      i.queueId === nextItem.queueId ? { ...i, status: 'downloading' } : i
    ));

    try {
      const result = await window.electronAPI.startDownload({
        url: nextItem.url,
        format: nextItem.format,
        quality: nextItem.quality,
        outputDir: nextItem.outputDir,
        outputPath: nextItem.outputPath,
        embedThumbnail: nextItem.embedThumbnail,
        trimStart: nextItem.trimStart,
        trimEnd: nextItem.trimEnd,
        title: nextItem.title,
        // Advanced options
        subtitles: nextItem.subtitles,
        sponsorblock: nextItem.sponsorblock,
        embedMetadata: nextItem.embedMetadata,
        speedLimit: nextItem.speedLimit,
        cookiesBrowser: nextItem.cookiesBrowser,
      });

      if (result.success) {
        setQueue(prev => prev.map(i =>
          i.queueId === nextItem.queueId ? { ...i, processId: result.processId } : i
        ));
      } else {
        setQueue(prev => prev.map(i =>
          i.queueId === nextItem.queueId ? { ...i, status: 'failed', error: result.error } : i
        ));
        processingRef.current = false;
        setIsProcessing(false);
      }
    } catch (err) {
      setQueue(prev => prev.map(i =>
        i.queueId === nextItem.queueId ? { ...i, status: 'failed', error: err.message } : i
      ));
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [queue]);

  // Auto-process queue when items are added or a download finishes
  useEffect(() => {
    if (!processingRef.current && queue.some(i => i.status === 'waiting')) {
      processQueue();
    }
  }, [queue, isProcessing, processQueue]);

  // Cancel a download
  const cancelDownload = useCallback(async (queueId) => {
    const item = queue.find(i => i.queueId === queueId);
    if (item && item.processId) {
      await window.electronAPI.cancelDownload(item.processId);
      setQueue(prev => prev.map(i =>
        i.queueId === queueId ? { ...i, status: 'failed', error: 'Cancelled by user' } : i
      ));
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [queue]);

  // Pause a download — kills the process, marks as paused (yt-dlp --continue will resume)
  const pauseDownload = useCallback(async (queueId) => {
    const item = queue.find(i => i.queueId === queueId);
    if (item && item.processId) {
      await window.electronAPI.cancelDownload(item.processId);
      setQueue(prev => prev.map(i =>
        i.queueId === queueId ? { ...i, status: 'paused', processId: null } : i
      ));
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [queue]);

  // Resume a paused download — re-queue it as waiting
  const resumeDownload = useCallback((queueId) => {
    setQueue(prev => prev.map(i =>
      i.queueId === queueId ? { ...i, status: 'waiting', processId: null, error: null } : i
    ));
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'downloader':
        return (
          <Downloader
            onAddToQueue={addToQueue}
            onNavigate={() => setActiveTab('queue')}
            speedLimit={speedLimit}
            cookiesBrowser={cookiesBrowser}
          />
        );
      case 'queue':
        return (
          <Queue
            queue={queue}
            onClearCompleted={clearCompleted}
            onCancel={cancelDownload}
            onRemove={removeFromQueue}
            onStartQueue={processQueue}
            onPause={pauseDownload}
            onResume={resumeDownload}
            speedUnit={speedUnit}
          />
        );
      case 'history':
        return (
          <History
            history={history}
            onClearHistory={clearHistory}
          />
        );
      case 'settings':
        return (
          <Settings
            theme={theme}
            onToggleTheme={toggleTheme}
            speedLimit={speedLimit}
            onSpeedLimitChange={changeSpeedLimit}
            cookiesBrowser={cookiesBrowser}
            onCookiesBrowserChange={changeCookiesBrowser}
            speedUnit={speedUnit}
            onSpeedUnitChange={changeSpeedUnit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="titlebar" />
      <div className="app-layout">
        <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <PlaySquare size={18} fill="currentColor" />
          </div>
          <div>
            <h1>Rivulet</h1>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by Vishnu852002</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                id={`nav-${item.id}`}
              >
                <span className="nav-icon"><Icon size={18} /></span>
                {item.label}
                {item.id === 'queue' && queue.filter(i => i.status === 'waiting' || i.status === 'downloading').length > 0 && (
                  <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>
                    {queue.filter(i => i.status === 'waiting' || i.status === 'downloading').length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main-content">
        {renderPage()}
      </main>
      </div>
    </>
  );
}
