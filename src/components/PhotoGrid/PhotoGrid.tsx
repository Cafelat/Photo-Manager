import React from 'react';
import { usePhotoStore } from '../../stores';
import { Photo } from '../../types/photo';
import './PhotoGrid.css';

interface PhotoGridItemProps {
  photo: Photo;
  onClick: (photo: Photo) => void;
}

const PhotoGridItem: React.FC<PhotoGridItemProps> = ({ photo, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="photo-grid-item" onClick={() => onClick(photo)}>
      <div className="photo-grid-item-wrapper">
        {!imageLoaded && !imageError && (
          <div className="photo-grid-item-placeholder">
            <div className="spinner"></div>
          </div>
        )}
        {imageError && (
          <div className="photo-grid-item-error">
            <span>Failed to load</span>
          </div>
        )}
        <img
          src={photo.thumbnailPath || `file://${photo.path}`}
          alt={photo.filename}
          className={`photo-grid-item-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />
        <div className="photo-grid-item-overlay">
          <span className="photo-grid-item-filename">{photo.filename}</span>
          {photo.metadata.isFavorite && (
            <span className="photo-grid-item-favorite">★</span>
          )}
          {photo.metadata.rating && photo.metadata.rating > 0 && (
            <span className="photo-grid-item-rating">
              {'★'.repeat(photo.metadata.rating)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface PhotoGridProps {
  photos?: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos: propPhotos,
  onPhotoClick,
}) => {
  const storePhotos = usePhotoStore((state) => state.photos);
  const setSelectedPhoto = usePhotoStore((state) => state.setSelectedPhoto);
  const setViewMode = usePhotoStore((state) => state.setViewMode);

  const photos = propPhotos || storePhotos;

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo.id);
    setViewMode('detail');
    onPhotoClick?.(photo);
  };

  if (photos.length === 0) {
    return (
      <div className="photo-grid-empty">
        <div className="photo-grid-empty-content">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <h2>No photos yet</h2>
          <p>Select a folder to start importing photos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      <div className="photo-grid-container">
        {photos.map((photo) => (
          <PhotoGridItem
            key={photo.id}
            photo={photo}
            onClick={handlePhotoClick}
          />
        ))}
      </div>
    </div>
  );
};
