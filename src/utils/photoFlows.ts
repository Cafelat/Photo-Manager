import { tauriCommands, DbPhoto } from './tauriCommands';
import { Photo, EXIFData, PhotoMetadata } from '../types/photo';
import { usePhotoStore } from '../stores/photoStore';

// Convert database photo to frontend Photo type
function dbPhotoToPhoto(dbPhoto: DbPhoto): Photo {
  const tags = dbPhoto.tags ? JSON.parse(dbPhoto.tags) : [];
  
  const metadata: PhotoMetadata = {
    tags,
    rating: dbPhoto.rating,
    description: dbPhoto.description || undefined,
    isFavorite: dbPhoto.is_favorite,
  };

  const exif: EXIFData | undefined = dbPhoto.capture_date
    ? {
        captureDate: dbPhoto.capture_date,
      }
    : undefined;

  return {
    id: dbPhoto.id.toString(),
    path: dbPhoto.path,
    filename: dbPhoto.filename,
    thumbnailPath: dbPhoto.thumbnail_path || undefined,
    exif,
    metadata,
    addedAt: new Date(dbPhoto.added_at),
  };
}

export interface ScanProgress {
  current: number;
  total: number;
  currentFile: string;
}

export type ProgressCallback = (progress: ScanProgress) => void;

export const photoFlows = {
  /**
   * Complete folder loading flow:
   * 1. Select folder using dialog
   * 2. Scan images in folder
   * 3. For each image: get EXIF, get dimensions, generate thumbnail
   * 4. Insert into database
   * 5. Update PhotoStore
   */
  async loadFolder(
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // Initialize database
      await tauriCommands.initDatabase();

      // Select folder
      const folderPath = await tauriCommands.selectFolder();
      if (!folderPath) {
        return { success: false, count: 0, error: 'No folder selected' };
      }

      // Scan images
      const imageFiles = await tauriCommands.scanImages(folderPath);
      const total = imageFiles.length;

      if (total === 0) {
        return { success: true, count: 0 };
      }

      const loadedPhotos: Photo[] = [];
      let successCount = 0;

      // Process each image
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];

        try {
          onProgress?.({
            current: i + 1,
            total,
            currentFile: file.filename,
          });

          // Get EXIF data
          const exifData = await tauriCommands.getExif(file.path);

          // Get image dimensions
          const dimensions = await tauriCommands.getImageDimensions(file.path);

          // Generate thumbnail
          const thumbnail = await tauriCommands.generateThumbnail(file.path);

          // Prepare photo object for database
          const dbPhoto: Omit<DbPhoto, 'id'> = {
            path: file.path,
            filename: file.filename,
            file_size: file.file_size,
            width: dimensions.width,
            height: dimensions.height,
            capture_date: exifData.capture_date || null,
            added_at: new Date().toISOString(),
            rating: 0,
            is_favorite: false,
            tags: '[]',
            description: null,
            thumbnail_path: thumbnail.thumbnail_path,
          };

          // Insert into database
          const photoId = await tauriCommands.insertPhoto(dbPhoto);

          // Create Photo object for store
          const photo = dbPhotoToPhoto({ ...dbPhoto, id: photoId });
          
          // Add EXIF data
          photo.exif = {
            captureDate: exifData.capture_date,
            cameraModel: exifData.camera_model,
            lensModel: exifData.lens_model,
            iso: exifData.iso,
            aperture: exifData.aperture,
            shutterSpeed: exifData.shutter_speed,
            focalLength: exifData.focal_length,
          };

          loadedPhotos.push(photo);
          successCount++;
        } catch (error) {
          console.error(`Failed to process ${file.filename}:`, error);
          // Continue with next file
        }
      }

      // Update store with all loaded photos
      const store = usePhotoStore.getState();
      store.addPhotos(loadedPhotos);

      return { success: true, count: successCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, count: 0, error: message };
    }
  },

  /**
   * Reload all photos from database
   */
  async reloadPhotos(): Promise<void> {
    try {
      const dbPhotos = await tauriCommands.getAllPhotos();
      const photos = dbPhotos.map(dbPhotoToPhoto);
      
      const store = usePhotoStore.getState();
      store.setPhotos(photos);
    } catch (error) {
      console.error('Failed to reload photos:', error);
      throw error;
    }
  },

  /**
   * Update photo metadata with optimistic UI update
   */
  async updatePhotoMetadata(
    photoId: string,
    updates: Partial<PhotoMetadata>
  ): Promise<void> {
    const store = usePhotoStore.getState();
    const photo = store.getPhotoById(photoId);
    
    if (!photo) {
      throw new Error('Photo not found');
    }

    // Optimistic update
    const updatedPhoto: Partial<Photo> = {
      metadata: { ...photo.metadata, ...updates },
    };
    store.updatePhoto(photoId, updatedPhoto);

    try {
      // Convert to database format
      const dbPhotoId = parseInt(photoId, 10);
      const tags = updates.tags ? JSON.stringify(updates.tags) : undefined;

      // Call backend
      await tauriCommands.updateMetadata(
        dbPhotoId,
        updates.rating,
        updates.isFavorite,
        tags,
        updates.description
      );
    } catch (error) {
      // Revert on error
      store.updatePhoto(photoId, { metadata: photo.metadata });
      throw error;
    }
  },
};
