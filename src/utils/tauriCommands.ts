import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// Database commands
export interface DbPhoto {
  id: number;
  path: string;
  filename: string;
  file_size: number;
  width: number;
  height: number;
  capture_date: string | null;
  added_at: string;
  rating: number;
  is_favorite: boolean;
  tags: string;
  description: string | null;
  thumbnail_path: string | null;
}

export interface DbCollection {
  id: number;
  name: string;
  created_at: string;
}

export const tauriCommands = {
  // Database
  async initDatabase(): Promise<string> {
    return invoke('init_database');
  },

  async insertPhoto(photo: Omit<DbPhoto, 'id'>): Promise<number> {
    return invoke('insert_photo', { photo });
  },

  async getAllPhotos(): Promise<DbPhoto[]> {
    return invoke('get_all_photos');
  },

  async updateMetadata(
    photoId: number,
    rating?: number,
    isFavorite?: boolean,
    tags?: string,
    description?: string
  ): Promise<void> {
    return invoke('update_metadata', {
      photoId,
      rating,
      isFavorite,
      tags,
      description,
    });
  },

  // Collections
  async createCollection(name: string): Promise<number> {
    return invoke('create_collection', { name });
  },

  async getAllCollections(): Promise<DbCollection[]> {
    return invoke('get_all_collections');
  },

  async addPhotoToCollection(
    photoId: number,
    collectionId: number
  ): Promise<void> {
    return invoke('add_photo_to_collection', { photoId, collectionId });
  },

  async removePhotoFromCollection(
    photoId: number,
    collectionId: number
  ): Promise<void> {
    return invoke('remove_photo_from_collection', { photoId, collectionId });
  },

  async getPhotosInCollection(collectionId: number): Promise<DbPhoto[]> {
    return invoke('get_photos_in_collection', { collectionId });
  },

  async exportDatabaseToJson(): Promise<string> {
    return invoke('export_database_to_json');
  },

  // File system
  async selectFolder(): Promise<string | null> {
    return open({
      directory: true,
      multiple: false,
    });
  },

  async scanImages(folderPath: string): Promise<
    Array<{
      path: string;
      filename: string;
      file_size: number;
    }>
  > {
    return invoke('scan_images', { folderPath });
  },

  // EXIF
  async getExif(path: string): Promise<{
    camera_make?: string;
    camera_model?: string;
    lens_model?: string;
    focal_length?: number;
    aperture?: number;
    shutter_speed?: string;
    iso?: number;
    exposure_bias?: number;
    flash?: string;
    orientation?: number;
    capture_date?: string;
    gps_latitude?: number;
    gps_longitude?: number;
    gps_altitude?: number;
  }> {
    return invoke('get_exif', { path });
  },

  // Image processing
  async getImageDimensions(path: string): Promise<{
    width: number;
    height: number;
  }> {
    return invoke('get_image_dimensions', { path });
  },

  async generateThumbnail(imagePath: string): Promise<{
    thumbnail_path: string;
    width: number;
    height: number;
  }> {
    return invoke('generate_thumbnail', { imagePath });
  },

  async resizeImage(
    sourcePath: string,
    destPath: string,
    width?: number,
    height?: number,
    preserveExif: boolean = true
  ): Promise<void> {
    return invoke('resize_image', {
      sourcePath,
      destPath,
      width,
      height,
      preserveExif,
    });
  },

  async clearThumbnailCache(): Promise<number> {
    return invoke('clear_thumbnail_cache');
  },

  async getCacheSize(): Promise<number> {
    return invoke('get_cache_size');
  },
};
