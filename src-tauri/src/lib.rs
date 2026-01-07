// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod services;

use services::db::{DatabaseService, Photo, Collection};
use services::fs::{FileSystemService, ImageFile};
use services::exif::{EXIFService, EXIFData};
use services::image::{ImageService, ImageDimensions, ThumbnailResult};
use std::sync::Mutex;
use tauri::{State, Manager};

struct AppState {
    db: Mutex<Option<DatabaseService>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Database commands
#[tauri::command]
fn init_database(app_handle: tauri::AppHandle, state: State<AppState>) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let db_path = app_data_dir.join("photo-manager").join("photos.db");
    
    let db = DatabaseService::new(db_path)
        .map_err(|e| format!("Failed to initialize database: {}", e))?;
    
    let mut state_db = state.db.lock().unwrap();
    *state_db = Some(db);
    
    Ok("Database initialized".to_string())
}

#[tauri::command]
fn insert_photo(state: State<AppState>, photo: Photo) -> Result<i64, String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.insert_photo(&photo)
        .map_err(|e| format!("Failed to insert photo: {}", e))
}

#[tauri::command]
fn get_all_photos(state: State<AppState>) -> Result<Vec<Photo>, String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.get_all_photos()
        .map_err(|e| format!("Failed to get photos: {}", e))
}

#[tauri::command]
fn update_metadata(
    state: State<AppState>,
    photo_id: i64,
    rating: Option<i32>,
    is_favorite: Option<bool>,
    tags: Option<String>,
    description: Option<String>,
) -> Result<(), String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.update_metadata(photo_id, rating, is_favorite, tags, description)
        .map_err(|e| format!("Failed to update metadata: {}", e))
}

#[tauri::command]
fn create_collection(state: State<AppState>, name: String) -> Result<i64, String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.create_collection(&name)
        .map_err(|e| format!("Failed to create collection: {}", e))
}

#[tauri::command]
fn get_all_collections(state: State<AppState>) -> Result<Vec<Collection>, String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.get_all_collections()
        .map_err(|e| format!("Failed to get collections: {}", e))
}

#[tauri::command]
fn add_photo_to_collection(
    state: State<AppState>,
    photo_id: i64,
    collection_id: i64,
) -> Result<(), String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.add_photo_to_collection(photo_id, collection_id)
        .map_err(|e| format!("Failed to add photo to collection: {}", e))
}

#[tauri::command]
fn remove_photo_from_collection(
    state: State<AppState>,
    photo_id: i64,
    collection_id: i64,
) -> Result<(), String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.remove_photo_from_collection(photo_id, collection_id)
        .map_err(|e| format!("Failed to remove photo from collection: {}", e))
}

#[tauri::command]
fn get_photos_in_collection(state: State<AppState>, collection_id: i64) -> Result<Vec<Photo>, String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.get_photos_in_collection(collection_id)
        .map_err(|e| format!("Failed to get photos in collection: {}", e))
}

#[tauri::command]
fn export_database_to_json(state: State<AppState>) -> Result<String, String> {
    let state_db = state.db.lock().unwrap();
    let db = state_db.as_ref().ok_or("Database not initialized")?;
    
    db.export_to_json()
        .map_err(|e| format!("Failed to export database: {}", e))
}

// File system commands
#[tauri::command]
fn scan_images(folder_path: String) -> Result<Vec<ImageFile>, String> {
    FileSystemService::scan_images(&folder_path)
}

// EXIF commands
#[tauri::command]
fn get_exif(path: String) -> Result<EXIFData, String> {
    EXIFService::extract_exif(&path)
}

// Image processing commands
#[tauri::command]
fn get_image_dimensions(path: String) -> Result<ImageDimensions, String> {
    ImageService::get_dimensions(&path)
}

#[tauri::command]
fn generate_thumbnail(
    app_handle: tauri::AppHandle,
    image_path: String,
) -> Result<ThumbnailResult, String> {
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {}", e))?
        .join("photo-manager")
        .join("thumbnails");
    
    ImageService::generate_thumbnail(&image_path, &cache_dir)
}

#[tauri::command]
fn resize_image(
    source_path: String,
    dest_path: String,
    width: Option<u32>,
    height: Option<u32>,
    preserve_exif: bool,
) -> Result<(), String> {
    ImageService::resize_image(&source_path, &dest_path, width, height, preserve_exif)
}

#[tauri::command]
fn clear_thumbnail_cache(app_handle: tauri::AppHandle) -> Result<usize, String> {
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {}", e))?
        .join("photo-manager")
        .join("thumbnails");
    
    ImageService::clear_cache(&cache_dir)
}

#[tauri::command]
fn get_cache_size(app_handle: tauri::AppHandle) -> Result<u64, String> {
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {}", e))?
        .join("photo-manager")
        .join("thumbnails");
    
    ImageService::get_cache_size(&cache_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            db: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            init_database,
            insert_photo,
            get_all_photos,
            update_metadata,
            create_collection,
            get_all_collections,
            add_photo_to_collection,
            remove_photo_from_collection,
            get_photos_in_collection,
            export_database_to_json,
            scan_images,
            get_exif,
            get_image_dimensions,
            generate_thumbnail,
            resize_image,
            clear_thumbnail_cache,
            get_cache_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
