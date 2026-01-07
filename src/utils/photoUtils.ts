import { Photo, PhotoFilters, SortBy, SortOrder } from '../types/photo';

/**
 * Apply filters to a list of photos
 */
export function applyFilters(photos: Photo[], filters: PhotoFilters): Photo[] {
  let filtered = [...photos];

  // Tag filter (AND condition - photo must have all selected tags)
  if (filters.tags.length > 0) {
    filtered = filtered.filter((photo) =>
      filters.tags.every((tag) => photo.metadata.tags.includes(tag))
    );
  }

  // Rating filter
  if (filters.minRating !== undefined) {
    filtered = filtered.filter(
      (photo) =>
        photo.metadata.rating !== undefined &&
        photo.metadata.rating >= filters.minRating!
    );
  }

  // Date range filter
  if (filters.dateRange) {
    filtered = filtered.filter((photo) => {
      if (!photo.exif?.captureDate) return false;

      const captureDate = new Date(photo.exif.captureDate);
      const { start, end } = filters.dateRange!;

      return captureDate >= start && captureDate <= end;
    });
  }

  // Keyword filter (searches in filename and description)
  if (filters.keyword && filters.keyword.trim() !== '') {
    const keyword = filters.keyword.toLowerCase().trim();
    filtered = filtered.filter(
      (photo) =>
        photo.filename.toLowerCase().includes(keyword) ||
        photo.metadata.description?.toLowerCase().includes(keyword)
    );
  }

  return filtered;
}

/**
 * Sort photos by specified criteria
 */
export function sortPhotos(
  photos: Photo[],
  sortBy: SortBy,
  sortOrder: SortOrder
): Photo[] {
  const sorted = [...photos];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'captureDate': {
        const dateA = a.exif?.captureDate
          ? new Date(a.exif.captureDate).getTime()
          : 0;
        const dateB = b.exif?.captureDate
          ? new Date(b.exif.captureDate).getTime()
          : 0;
        comparison = dateA - dateB;
        break;
      }

      case 'filename':
        comparison = a.filename.localeCompare(b.filename);
        break;

      case 'rating': {
        const ratingA = a.metadata.rating ?? 0;
        const ratingB = b.metadata.rating ?? 0;
        comparison = ratingA - ratingB;
        break;
      }

      case 'addedDate':
        comparison = a.addedAt.getTime() - b.addedAt.getTime();
        break;

      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get all unique tags from a list of photos
 */
export function getAllTags(photos: Photo[]): string[] {
  const tagSet = new Set<string>();

  photos.forEach((photo) => {
    photo.metadata.tags.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

/**
 * Get favorite photos
 */
export function getFavoritePhotos(photos: Photo[]): Photo[] {
  return photos.filter((photo) => photo.metadata.isFavorite);
}

/**
 * Search photos by keyword
 */
export function searchPhotos(photos: Photo[], keyword: string): Photo[] {
  if (!keyword || keyword.trim() === '') {
    return photos;
  }

  const lowerKeyword = keyword.toLowerCase().trim();

  return photos.filter(
    (photo) =>
      photo.filename.toLowerCase().includes(lowerKeyword) ||
      photo.metadata.description?.toLowerCase().includes(lowerKeyword) ||
      photo.metadata.tags.some((tag) =>
        tag.toLowerCase().includes(lowerKeyword)
      )
  );
}

/**
 * Get photos by rating range
 */
export function getPhotosByRating(
  photos: Photo[],
  minRating: number,
  maxRating?: number
): Photo[] {
  return photos.filter((photo) => {
    const rating = photo.metadata.rating ?? 0;
    if (maxRating !== undefined) {
      return rating >= minRating && rating <= maxRating;
    }
    return rating >= minRating;
  });
}
