use crate::error::AppError;
use crate::telemetry;

#[tauri::command]
#[specta::specta]
pub fn set_telemetry_consent(granted: bool) {
    telemetry::set_consent(granted);
}

#[tauri::command]
#[specta::specta]
pub fn read_log_tail(app: tauri::AppHandle) -> Result<String, AppError> {
    telemetry::read_log_tail(&app).map_err(AppError::Internal)
}

#[cfg(debug_assertions)]
#[tauri::command]
#[specta::specta]
pub fn trigger_test_panic() {
    panic!("forced panic for Sentry verification");
}
