use rusqlite::{Connection, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use log::{info, error};

const SCHEMA_VERSION: i32 = 1;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Photo {
    pub id: i64,
    pub path: String,
    pub filename: String,
    pub file_size: i64,
    pub width: i32,
    pub height: i32,
    pub capture_date: Option<String>,
    pub added_at: String,
    pub rating: i32,
    pub is_favorite: bool,
    pub tags: String, // JSON array as string
    pub description: Option<String>,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Collection {
    pub id: i64,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PhotoCollection {
    pub photo_id: i64,
    pub collection_id: i64,
}

pub struct DatabaseService {
    conn: Connection,
}

impl DatabaseService {
    pub fn new(db_path: PathBuf) -> SqlResult<Self> {
        info!("Initializing database at: {:?}", db_path);
        
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                error!("Failed to create database directory: {}", e);
                rusqlite::Error::InvalidPath(db_path.clone())
            })?;
        }

        let conn = Connection::open(&db_path)?;
        let service = DatabaseService { conn };
        service.init_schema()?;
        
        info!("Database initialized successfully");
        Ok(service)
    }

    fn init_schema(&self) -> SqlResult<()> {
        info!("Creating database schema");

        // Create app_metadata table for version tracking
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        // Check and set schema version
        let version: Option<i32> = self.conn
            .query_row(
                "SELECT value FROM app_metadata WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .ok();

        if version.is_none() {
            self.conn.execute(
                "INSERT INTO app_metadata (key, value) VALUES ('schema_version', ?1)",
                params![SCHEMA_VERSION.to_string()],
            )?;
        }

        // Create photos table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                filename TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                capture_date TEXT,
                added_at TEXT NOT NULL DEFAULT (datetime('now')),
                rating INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                tags TEXT NOT NULL DEFAULT '[]',
                description TEXT,
                thumbnail_path TEXT
            )",
            [],
        )?;

        // Create indexes on photos table
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating)",
            [],
        )?;
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_photos_capture_date ON photos(capture_date)",
            [],
        )?;
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_photos_added_at ON photos(added_at)",
            [],
        )?;
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_photos_is_favorite ON photos(is_favorite)",
            [],
        )?;

        // Create collections table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            [],
        )?;

        // Create photo_collections junction table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS photo_collections (
                photo_id INTEGER NOT NULL,
                collection_id INTEGER NOT NULL,
                PRIMARY KEY (photo_id, collection_id),
                FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
            )",
            [],
        )?;

        info!("Database schema created successfully");
        Ok(())
    }

    pub fn insert_photo(&self, photo: &Photo) -> SqlResult<i64> {
        self.conn.execute(
            "INSERT INTO photos (path, filename, file_size, width, height, capture_date, rating, is_favorite, tags, description, thumbnail_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                photo.path,
                photo.filename,
                photo.file_size,
                photo.width,
                photo.height,
                photo.capture_date,
                photo.rating,
                photo.is_favorite as i32,
                photo.tags,
                photo.description,
                photo.thumbnail_path,
            ],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_all_photos(&self) -> SqlResult<Vec<Photo>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, path, filename, file_size, width, height, capture_date, added_at, rating, is_favorite, tags, description, thumbnail_path
             FROM photos
             ORDER BY added_at DESC"
        )?;

        let photos = stmt.query_map([], |row| {
            Ok(Photo {
                id: row.get(0)?,
                path: row.get(1)?,
                filename: row.get(2)?,
                file_size: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                capture_date: row.get(6)?,
                added_at: row.get(7)?,
                rating: row.get(8)?,
                is_favorite: row.get::<_, i32>(9)? != 0,
                tags: row.get(10)?,
                description: row.get(11)?,
                thumbnail_path: row.get(12)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

        Ok(photos)
    }

    pub fn update_metadata(&self, photo_id: i64, rating: Option<i32>, is_favorite: Option<bool>, tags: Option<String>, description: Option<String>) -> SqlResult<()> {
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(r) = rating {
            updates.push("rating = ?");
            params.push(Box::new(r));
        }
        if let Some(fav) = is_favorite {
            updates.push("is_favorite = ?");
            params.push(Box::new(fav as i32));
        }
        if let Some(t) = tags {
            updates.push("tags = ?");
            params.push(Box::new(t));
        }
        if let Some(d) = description {
            updates.push("description = ?");
            params.push(Box::new(d));
        }

        if updates.is_empty() {
            return Ok(());
        }

        params.push(Box::new(photo_id));
        let query = format!("UPDATE photos SET {} WHERE id = ?", updates.join(", "));
        
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        self.conn.execute(&query, param_refs.as_slice())?;
        Ok(())
    }

    pub fn create_collection(&self, name: &str) -> SqlResult<i64> {
        self.conn.execute(
            "INSERT INTO collections (name) VALUES (?1)",
            params![name],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_all_collections(&self) -> SqlResult<Vec<Collection>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, created_at FROM collections ORDER BY created_at DESC"
        )?;

        let collections = stmt.query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

        Ok(collections)
    }

    pub fn add_photo_to_collection(&self, photo_id: i64, collection_id: i64) -> SqlResult<()> {
        self.conn.execute(
            "INSERT OR IGNORE INTO photo_collections (photo_id, collection_id) VALUES (?1, ?2)",
            params![photo_id, collection_id],
        )?;
        Ok(())
    }

    pub fn remove_photo_from_collection(&self, photo_id: i64, collection_id: i64) -> SqlResult<()> {
        self.conn.execute(
            "DELETE FROM photo_collections WHERE photo_id = ?1 AND collection_id = ?2",
            params![photo_id, collection_id],
        )?;
        Ok(())
    }

    pub fn get_photos_in_collection(&self, collection_id: i64) -> SqlResult<Vec<Photo>> {
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.path, p.filename, p.file_size, p.width, p.height, p.capture_date, p.added_at, p.rating, p.is_favorite, p.tags, p.description, p.thumbnail_path
             FROM photos p
             INNER JOIN photo_collections pc ON p.id = pc.photo_id
             WHERE pc.collection_id = ?1
             ORDER BY p.added_at DESC"
        )?;

        let photos = stmt.query_map(params![collection_id], |row| {
            Ok(Photo {
                id: row.get(0)?,
                path: row.get(1)?,
                filename: row.get(2)?,
                file_size: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                capture_date: row.get(6)?,
                added_at: row.get(7)?,
                rating: row.get(8)?,
                is_favorite: row.get::<_, i32>(9)? != 0,
                tags: row.get(10)?,
                description: row.get(11)?,
                thumbnail_path: row.get(12)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

        Ok(photos)
    }

    pub fn export_to_json(&self) -> SqlResult<String> {
        #[derive(Serialize)]
        struct Backup {
            photos: Vec<Photo>,
            collections: Vec<Collection>,
            photo_collections: Vec<PhotoCollection>,
        }

        let photos = self.get_all_photos()?;
        let collections = self.get_all_collections()?;
        
        let mut stmt = self.conn.prepare("SELECT photo_id, collection_id FROM photo_collections")?;
        let photo_collections = stmt.query_map([], |row| {
            Ok(PhotoCollection {
                photo_id: row.get(0)?,
                collection_id: row.get(1)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

        let backup = Backup {
            photos,
            collections,
            photo_collections,
        };

        serde_json::to_string_pretty(&backup).map_err(|e| {
            error!("Failed to serialize backup: {}", e);
            rusqlite::Error::ToSqlConversionFailure(Box::new(e))
        })
    }
}
