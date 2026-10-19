use serde::Serialize;
use specta::Type;

#[derive(Debug, Serialize, Type)]
pub struct AppInfo {
    pub version: String,
    pub os: String,
    pub arch: String,
}

#[tauri::command]
#[specta::specta]
pub fn get_app_info(app: tauri::AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}
