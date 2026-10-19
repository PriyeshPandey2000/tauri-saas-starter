use keyring::{Entry, Error as KeyringError};

use crate::error::AppError;

const MAX_KEY_LENGTH: usize = 256;

fn validate_key(key: &str) -> Result<(), AppError> {
    if key.trim().is_empty() {
        return Err(AppError::InvalidInput("key must not be empty".into()));
    }
    if key.len() > MAX_KEY_LENGTH {
        return Err(AppError::InvalidInput(format!(
            "key must be at most {MAX_KEY_LENGTH} bytes"
        )));
    }
    Ok(())
}

fn service_name(app: &tauri::AppHandle) -> String {
    app.config().identifier.clone()
}

#[tauri::command]
#[specta::specta]
pub async fn secure_set(
    app: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), AppError> {
    validate_key(&key)?;
    let service = service_name(&app);
    tauri::async_runtime::spawn_blocking(move || -> Result<(), AppError> {
        let entry = Entry::new(&service, &key).map_err(keychain_error)?;
        entry.set_password(&value).map_err(keychain_error)
    })
    .await
    .map_err(|error| AppError::Internal(error.to_string()))?
}

#[tauri::command]
#[specta::specta]
pub async fn secure_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, AppError> {
    validate_key(&key)?;
    let service = service_name(&app);
    tauri::async_runtime::spawn_blocking(move || -> Result<Option<String>, AppError> {
        let entry = Entry::new(&service, &key).map_err(keychain_error)?;
        match entry.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(KeyringError::NoEntry) => Ok(None),
            Err(error) => Err(keychain_error(error)),
        }
    })
    .await
    .map_err(|error| AppError::Internal(error.to_string()))?
}

#[tauri::command]
#[specta::specta]
pub async fn secure_delete(app: tauri::AppHandle, key: String) -> Result<(), AppError> {
    validate_key(&key)?;
    let service = service_name(&app);
    tauri::async_runtime::spawn_blocking(move || -> Result<(), AppError> {
        let entry = Entry::new(&service, &key).map_err(keychain_error)?;
        match entry.delete_credential() {
            Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
            Err(error) => Err(keychain_error(error)),
        }
    })
    .await
    .map_err(|error| AppError::Internal(error.to_string()))?
}

fn keychain_error(error: KeyringError) -> AppError {
    AppError::Keychain(error.to_string())
}
