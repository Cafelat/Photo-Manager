import React, { useEffect, useState, useCallback } from 'react';
import { usePhotoStore } from '../../stores';
import { Photo } from '../../types/photo';
import './PhotoViewer.css';

interface PhotoViewerProps {
  photo?: Photo;
  onClose?: () => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo: propPhoto,
  onClose,
}) => {
  const selectedPhoto = usePhotoStore((state) => state.getSelectedPhoto());
  const photos = usePhotoStore((state) => state.photos);
  const setSelectedPhoto = usePhotoStore((state) => state.setSelectedPhoto);
  const setViewMode = usePhotoStore((state) => state.setViewMode);

  const photo = propPhoto || selectedPhoto;

  const [zoom, setZoom] = useState(1.0);
  const [showExif, setShowExif] = useState(false);

  const currentIndex = photo
    ? photos.findIndex((p) => p.id === photo.id)
    : -1;

  const handleClose = useCallback(() => {
    setViewMode('grid');
    setSelectedPhoto(null);
    setZoom(1.0);
    onClose?.();
  }, [setViewMode, setSelectedPhoto, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1].id);
      setZoom(1.0);
    }
  }, [currentIndex, photos, setSelectedPhoto]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1].id);
      setZoom(1.0);
    }
  }, [currentIndex, photos, setSelectedPhoto]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 5.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1.0));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
        case 'i':
        case 'I':
          setShowExif((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handlePrevious, handleNext]);

  if (!photo) {
    return null;
  }

  return (
    <div className="photo-viewer-overlay" onClick={handleClose}>
      <div className="photo-viewer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="photo-viewer-header">
          <div className="photo-viewer-title">
            <span>{photo.filename}</span>
            <span className="photo-viewer-counter">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>
          <div className="photo-viewer-controls">
            <button
              className="photo-viewer-button"
              onClick={() => setShowExif(!showExif)}
              title="Toggle EXIF info (I)"
            >
              ℹ️
            </button>
            <button
              className="photo-viewer-button"
              onClick={handleClose}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="photo-viewer-content">
          {/* Image container */}
          <div className="photo-viewer-image-container" onWheel={handleWheel}>
            <img
              src={`file://${photo.path}`}
              alt={photo.filename}
              className="photo-viewer-image"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>

          {/* EXIF panel */}
          {showExif && photo.exif && (
            <div className="photo-viewer-exif">
              <h3>EXIF Information</h3>
              <div className="photo-viewer-exif-grid">
                {photo.exif.captureDate && (
                  <div className="photo-viewer-exif-item">
                    <span className="photo-viewer-exif-label">Date:</span>
                    <span className="photo-viewer-exif-value">
                      {photo.exif.captureDate}
                    </span>
                  </div>
                )}
                {photo.exif.cameraModel && (
                  <div className="photo-viewer-exif-item">
                    <span className="photo-viewer-exif-label">Camera:</span>
                    <span className="photo-viewer-exif-value">
                      {photo.exif.cameraModel}
                    </span>
                  </div>
                )}
                {photo.exif.lensModel && (
                  <div className="photo-viewer-exif-item">
                    <span className="photo-viewer-exif-label">Lens:</span>
                    <span className="photo-viewer-exif-value">
                      {photo.exif.lensModel}
                    </span>
                  </div>
                )}
                {photo.exif.focalLength && (
                  <div className="photo-viewer-exif-item">
                    <span className="photo-viewer-exif-label">
                      Focal Length:
                    </span>
                    <span className="photo-viewer-exif-value">
                      {photo.exif.focalLength}mm
                    </span>
                  </div>
                )}
                {photo.exif.aperture && (
                  <div className="photo-viewer-exif-item">
                    <span className="photo-viewer-exif-label">Aperture:</span>
                    <span className="photo-viewer-exif-value">
                      f/{photo.exif.aperture}
                    </span>
                  </div>
                )}
                {photo.exif.shutterSpeed && (
                  <div className="photo-viewer-exif-item">
                    <span className="photo-viewer-exif-label">
                      Shutter Speed:
                    </span>
                    <span className="photo-viewer-exif-value">
                      {photo.exif.shutterSpeed}
                    </span>
                  </div>
                )}
                {photo.exif.iso && (
                  <div className="photo-viewer-exif-item">
                    <span className="photo-viewer-exif-label">ISO:</span>
                    <span className="photo-viewer-exif-value">
                      {photo.exif.iso}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with navigation and zoom controls */}
        <div className="photo-viewer-footer">
          <div className="photo-viewer-navigation">
            <button
              className="photo-viewer-nav-button"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              title="Previous (←)"
            >
              ←
            </button>
            <button
              className="photo-viewer-nav-button"
              onClick={handleNext}
              disabled={currentIndex === photos.length - 1}
              title="Next (→)"
            >
              →
            </button>
          </div>

          <div className="photo-viewer-zoom">
            <button
              className="photo-viewer-zoom-button"
              onClick={handleZoomOut}
              disabled={zoom <= 1.0}
              title="Zoom out (-)"
            >
              −
            </button>
            <span className="photo-viewer-zoom-level">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="photo-viewer-zoom-button"
              onClick={handleZoomIn}
              disabled={zoom >= 5.0}
              title="Zoom in (+)"
            >
              +
            </button>
            <button
              className="photo-viewer-zoom-button"
              onClick={handleResetZoom}
              title="Reset zoom (0)"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
