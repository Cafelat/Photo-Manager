use image::{ImageFormat, imageops::FilterType};
use std::path::Path;
use std::fs;
use sha2::{Sha256, Digest};
use serde::{Deserialize, Serialize};
use log::{info, warn};

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageDimensions {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThumbnailResult {
    pub thumbnail_path: String,
    pub width: u32,
    pub height: u32,
}

const THUMBNAIL_SIZE: u32 = 200;

pub struct ImageService;

impl ImageService {
    pub fn get_dimensions(path: &str) -> Result<ImageDimensions, String> {
        let img = image::open(path)
            .map_err(|e| format!("Failed to open image: {}", e))?;

        Ok(ImageDimensions {
            width: img.width(),
            height: img.height(),
        })
    }

    pub fn generate_thumbnail(
        image_path: &str,
        cache_dir: &Path,
    ) -> Result<ThumbnailResult, String> {
        info!("Generating thumbnail for: {}", image_path);

        // Create cache directory if not exists
        if !cache_dir.exists() {
            fs::create_dir_all(cache_dir)
                .map_err(|e| format!("Failed to create cache directory: {}", e))?;
        }

        // Generate hash-based filename
        let hash = Self::hash_file_path(image_path);
        let thumbnail_filename = format!("{}.jpg", hash);
        let thumbnail_path = cache_dir.join(&thumbnail_filename);

        // Check if thumbnail already exists
        if thumbnail_path.exists() {
            info!("Using cached thumbnail: {:?}", thumbnail_path);
            let img = image::open(&thumbnail_path)
                .map_err(|e| format!("Failed to open cached thumbnail: {}", e))?;
            
            return Ok(ThumbnailResult {
                thumbnail_path: thumbnail_path.to_string_lossy().to_string(),
                width: img.width(),
                height: img.height(),
            });
        }

        // Load and resize image
        let img = image::open(image_path)
            .map_err(|e| format!("Failed to open image: {}", e))?;

        let thumbnail = img.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::Lanczos3);

        // Save thumbnail
        thumbnail
            .save_with_format(&thumbnail_path, ImageFormat::Jpeg)
            .map_err(|e| format!("Failed to save thumbnail: {}", e))?;

        info!("Thumbnail saved: {:?}", thumbnail_path);

        Ok(ThumbnailResult {
            thumbnail_path: thumbnail_path.to_string_lossy().to_string(),
            width: thumbnail.width(),
            height: thumbnail.height(),
        })
    }

    pub fn resize_image(
        source_path: &str,
        dest_path: &str,
        width: Option<u32>,
        height: Option<u32>,
        preserve_exif: bool,
    ) -> Result<(), String> {
        info!("Resizing image: {} -> {}", source_path, dest_path);

        let img = image::open(source_path)
            .map_err(|e| format!("Failed to open image: {}", e))?;

        let resized = match (width, height) {
            (Some(w), Some(h)) => img.resize_exact(w, h, FilterType::Lanczos3),
            (Some(w), None) => {
                let aspect_ratio = img.height() as f64 / img.width() as f64;
                let h = (w as f64 * aspect_ratio) as u32;
                img.resize_exact(w, h, FilterType::Lanczos3)
            }
            (None, Some(h)) => {
                let aspect_ratio = img.width() as f64 / img.height() as f64;
                let w = (h as f64 * aspect_ratio) as u32;
                img.resize_exact(w, h, FilterType::Lanczos3)
            }
            (None, None) => img,
        };

        // Determine format from destination path
        let format = Self::image_format_from_path(dest_path)?;
        
        resized
            .save_with_format(dest_path, format)
            .map_err(|e| format!("Failed to save resized image: {}", e))?;

        // Copy EXIF data if requested (note: basic implementation, full EXIF preservation requires additional library)
        if preserve_exif {
            warn!("EXIF preservation requested but not fully implemented in this version");
        }

        info!("Image resized successfully");
        Ok(())
    }

    pub fn clear_cache(cache_dir: &Path) -> Result<usize, String> {
        info!("Clearing thumbnail cache: {:?}", cache_dir);

        if !cache_dir.exists() {
            return Ok(0);
        }

        let mut count = 0;
        for entry in fs::read_dir(cache_dir)
            .map_err(|e| format!("Failed to read cache directory: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            
            if path.is_file() {
                fs::remove_file(&path)
                    .map_err(|e| format!("Failed to remove file: {}", e))?;
                count += 1;
            }
        }

        info!("Cleared {} cached thumbnails", count);
        Ok(count)
    }

    pub fn get_cache_size(cache_dir: &Path) -> Result<u64, String> {
        if !cache_dir.exists() {
            return Ok(0);
        }

        let mut total_size = 0u64;
        for entry in fs::read_dir(cache_dir)
            .map_err(|e| format!("Failed to read cache directory: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let metadata = entry.metadata()
                .map_err(|e| format!("Failed to read metadata: {}", e))?;
            
            if metadata.is_file() {
                total_size += metadata.len();
            }
        }

        Ok(total_size)
    }

    fn hash_file_path(path: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(path.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn image_format_from_path(path: &str) -> Result<ImageFormat, String> {
        let path_obj = Path::new(path);
        let ext = path_obj
            .extension()
            .and_then(|s| s.to_str())
            .ok_or_else(|| "No file extension found".to_string())?;

        match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" => Ok(ImageFormat::Jpeg),
            "png" => Ok(ImageFormat::Png),
            "webp" => Ok(ImageFormat::WebP),
            _ => Err(format!("Unsupported image format: {}", ext)),
        }
    }
}
