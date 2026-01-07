// Metadata-specific type definitions
export interface MetadataUpdate {
  photoId: string;
  tags?: string[];
  rating?: number;
  description?: string;
  isFavorite?: boolean;
}

export interface ExportOptions {
  resize?: { width: number; height: number };
  preserveExif: boolean;
  format?: 'original' | 'jpg' | 'png';
}

export interface ExportResult {
  exportedCount: number;
  failedPaths: string[];
}
