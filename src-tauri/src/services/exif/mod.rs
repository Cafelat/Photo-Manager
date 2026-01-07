use std::fs::File;
use std::io::BufReader;
use serde::{Deserialize, Serialize};
use log::{info, warn};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EXIFData {
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub lens_model: Option<String>,
    pub focal_length: Option<f64>,
    pub aperture: Option<f64>,
    pub shutter_speed: Option<String>,
    pub iso: Option<u32>,
    pub exposure_bias: Option<f64>,
    pub flash: Option<String>,
    pub orientation: Option<u32>,
    pub capture_date: Option<String>,
    pub gps_latitude: Option<f64>,
    pub gps_longitude: Option<f64>,
    pub gps_altitude: Option<f64>,
}

pub struct EXIFService;

impl EXIFService {
    pub fn extract_exif(path: &str) -> Result<EXIFData, String> {
        info!("Extracting EXIF from: {}", path);

        let file = File::open(path)
            .map_err(|e| format!("Failed to open file: {}", e))?;

        let mut bufreader = BufReader::new(&file);
        let exifreader = exif::Reader::new();
        
        let exif = match exifreader.read_from_container(&mut bufreader) {
            Ok(e) => e,
            Err(e) => {
                warn!("No EXIF data found in {}: {}", path, e);
                return Ok(EXIFData::default());
            }
        };

        let mut data = EXIFData::default();

        // Camera make
        if let Some(field) = exif.get_field(exif::Tag::Make, exif::In::PRIMARY) {
            data.camera_make = Some(field.display_value().to_string());
        }

        // Camera model
        if let Some(field) = exif.get_field(exif::Tag::Model, exif::In::PRIMARY) {
            data.camera_model = Some(field.display_value().to_string());
        }

        // Lens model
        if let Some(field) = exif.get_field(exif::Tag::LensModel, exif::In::PRIMARY) {
            data.lens_model = Some(field.display_value().to_string());
        }

        // Focal length
        if let Some(field) = exif.get_field(exif::Tag::FocalLength, exif::In::PRIMARY) {
            if let exif::Value::Rational(ref rationals) = field.value {
                if let Some(r) = rationals.first() {
                    data.focal_length = Some(r.num as f64 / r.denom as f64);
                }
            }
        }

        // Aperture (F-number)
        if let Some(field) = exif.get_field(exif::Tag::FNumber, exif::In::PRIMARY) {
            if let exif::Value::Rational(ref rationals) = field.value {
                if let Some(r) = rationals.first() {
                    data.aperture = Some(r.num as f64 / r.denom as f64);
                }
            }
        }

        // Shutter speed (Exposure time)
        if let Some(field) = exif.get_field(exif::Tag::ExposureTime, exif::In::PRIMARY) {
            data.shutter_speed = Some(field.display_value().to_string());
        }

        // ISO
        if let Some(field) = exif.get_field(exif::Tag::PhotographicSensitivity, exif::In::PRIMARY) {
            if let exif::Value::Short(ref values) = field.value {
                if let Some(&v) = values.first() {
                    data.iso = Some(v as u32);
                }
            }
        }

        // Exposure bias
        if let Some(field) = exif.get_field(exif::Tag::ExposureBiasValue, exif::In::PRIMARY) {
            if let exif::Value::SRational(ref rationals) = field.value {
                if let Some(r) = rationals.first() {
                    data.exposure_bias = Some(r.num as f64 / r.denom as f64);
                }
            }
        }

        // Flash
        if let Some(field) = exif.get_field(exif::Tag::Flash, exif::In::PRIMARY) {
            data.flash = Some(field.display_value().to_string());
        }

        // Orientation
        if let Some(field) = exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY) {
            if let exif::Value::Short(ref values) = field.value {
                if let Some(&v) = values.first() {
                    data.orientation = Some(v as u32);
                }
            }
        }

        // Capture date
        if let Some(field) = exif.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY) {
            data.capture_date = Some(field.display_value().to_string());
        } else if let Some(field) = exif.get_field(exif::Tag::DateTime, exif::In::PRIMARY) {
            data.capture_date = Some(field.display_value().to_string());
        }

        // GPS latitude
        if let Some(field) = exif.get_field(exif::Tag::GPSLatitude, exif::In::PRIMARY) {
            if let exif::Value::Rational(ref rationals) = field.value {
                if rationals.len() >= 3 {
                    let degrees = rationals[0].num as f64 / rationals[0].denom as f64;
                    let minutes = rationals[1].num as f64 / rationals[1].denom as f64;
                    let seconds = rationals[2].num as f64 / rationals[2].denom as f64;
                    data.gps_latitude = Some(degrees + minutes / 60.0 + seconds / 3600.0);
                }
            }
        }

        // GPS longitude
        if let Some(field) = exif.get_field(exif::Tag::GPSLongitude, exif::In::PRIMARY) {
            if let exif::Value::Rational(ref rationals) = field.value {
                if rationals.len() >= 3 {
                    let degrees = rationals[0].num as f64 / rationals[0].denom as f64;
                    let minutes = rationals[1].num as f64 / rationals[1].denom as f64;
                    let seconds = rationals[2].num as f64 / rationals[2].denom as f64;
                    data.gps_longitude = Some(degrees + minutes / 60.0 + seconds / 3600.0);
                }
            }
        }

        // GPS altitude
        if let Some(field) = exif.get_field(exif::Tag::GPSAltitude, exif::In::PRIMARY) {
            if let exif::Value::Rational(ref rationals) = field.value {
                if let Some(r) = rationals.first() {
                    data.gps_altitude = Some(r.num as f64 / r.denom as f64);
                }
            }
        }

        Ok(data)
    }
}

impl Default for EXIFData {
    fn default() -> Self {
        EXIFData {
            camera_make: None,
            camera_model: None,
            lens_model: None,
            focal_length: None,
            aperture: None,
            shutter_speed: None,
            iso: None,
            exposure_bias: None,
            flash: None,
            orientation: None,
            capture_date: None,
            gps_latitude: None,
            gps_longitude: None,
            gps_altitude: None,
        }
    }
}
