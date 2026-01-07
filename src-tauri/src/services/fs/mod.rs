use std::path::Path;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};
use log::{info, warn};

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageFile {
    pub path: String,
    pub filename: String,
    pub file_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
}

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "heic", "heif"];

pub struct FileSystemService;

impl FileSystemService {
    pub fn scan_images(folder_path: &str) -> Result<Vec<ImageFile>, String> {
        info!("Scanning folder: {}", folder_path);
        
        let path = Path::new(folder_path);
        if !path.exists() {
            return Err(format!("Folder does not exist: {}", folder_path));
        }
        if !path.is_dir() {
            return Err(format!("Path is not a directory: {}", folder_path));
        }

        let mut images = Vec::new();
        
        for entry in WalkDir::new(path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let entry_path = entry.path();
            
            if !entry_path.is_file() {
                continue;
            }

            if let Some(ext) = entry_path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if SUPPORTED_EXTENSIONS.contains(&ext_str.as_str()) {
                    let metadata = match std::fs::metadata(entry_path) {
                        Ok(m) => m,
                        Err(e) => {
                            warn!("Failed to read metadata for {:?}: {}", entry_path, e);
                            continue;
                        }
                    };

                    images.push(ImageFile {
                        path: entry_path.to_string_lossy().to_string(),
                        filename: entry_path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        file_size: metadata.len(),
                    });
                }
            }
        }

        info!("Found {} images in {}", images.len(), folder_path);
        Ok(images)
    }

    #[allow(dead_code)]
    pub fn is_image_file(path: &str) -> bool {
        if let Some(ext) = Path::new(path).extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            SUPPORTED_EXTENSIONS.contains(&ext_str.as_str())
        } else {
            false
        }
    }

    #[allow(dead_code)]
    pub fn get_file_info(path: &str) -> Result<ImageFile, String> {
        let path_obj = Path::new(path);
        
        if !path_obj.exists() {
            return Err(format!("File does not exist: {}", path));
        }

        let metadata = std::fs::metadata(path_obj)
            .map_err(|e| format!("Failed to read file metadata: {}", e))?;

        Ok(ImageFile {
            path: path.to_string(),
            filename: path_obj
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            file_size: metadata.len(),
        })
    }
}
