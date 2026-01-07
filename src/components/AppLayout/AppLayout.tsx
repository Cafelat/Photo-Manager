import React, { useState } from 'react';
import { usePhotoStore } from '../../stores';
import { photoFlows, ScanProgress } from '../../utils';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const photos = usePhotoStore((state) => state.photos);

  const handleLoadFolder = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(null);

    try {
      const result = await photoFlows.loadFolder((prog) => {
        setProgress(prog);
      });

      if (result.success) {
        showToast(
          `Successfully loaded ${result.count} photo${result.count !== 1 ? 's' : ''}`,
          'success'
        );
      } else if (result.error) {
        setError(result.error);
        showToast(result.error, 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleReloadPhotos = async () => {
    try {
      await photoFlows.reloadPhotos();
      showToast('Photos reloaded', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(message, 'error');
    }
  };

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">Photo Manager</h1>
          <span className="app-photo-count">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="app-header-right">
          <button
            className="app-button app-button-secondary"
            onClick={handleReloadPhotos}
            disabled={isLoading}
          >
            Reload
          </button>
          <button
            className="app-button app-button-primary"
            onClick={handleLoadFolder}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Folder'}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {isLoading && progress && (
        <div className="app-progress">
          <div className="app-progress-bar">
            <div
              className="app-progress-fill"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
          <div className="app-progress-text">
            Loading {progress.current} of {progress.total}: {progress.currentFile}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !isLoading && (
        <div className="app-error">
          <span>{error}</span>
          <button
            className="app-error-close"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="app-main">{children}</main>

      {/* Toast notification */}
      {toast && (
        <div className={`app-toast app-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
