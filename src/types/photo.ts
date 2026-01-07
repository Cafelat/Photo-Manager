// Photo type definitions
export interface Photo {
  id: string;
  path: string;
  filename: string;
  thumbnailPath?: string;
  exif?: EXIFData;
  metadata: PhotoMetadata;
  addedAt: Date;
}

export interface EXIFData {
  captureDate?: string;
  cameraModel?: string;
  lensModel?: string;
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
}

export interface PhotoMetadata {
  tags: string[];
  rating?: number;
  description?: string;
  isFavorite: boolean;
}

export interface Collection {
  id: string;
  name: string;
  photoIds: string[];
  createdAt: Date;
}

export interface PhotoFilters {
  tags: string[];
  minRating?: number;
  dateRange?: { start: Date; end: Date };
  keyword?: string;
}

export type SortBy = 'captureDate' | 'filename' | 'rating' | 'addedDate';
export type SortOrder = 'asc' | 'desc';
