use std::sync::Mutex;

use serde::Serialize;
use specta::Type;
use tauri::Emitter;
use tauri::State;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::error::AppError;

pub struct PendingUpdate(pub Mutex<Option<Update>>);

#[derive(Debug, Serialize, Type)]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum UpdateEvent {
    Started { content_length: Option<u64> },
    Progress { chunk_length: usize },
    Finished,
}

/// Pure so it can be unit-tested: stable is index 0, beta index 1.
pub fn endpoint_for_channel(endpoints: &[String], channel: &str) -> Option<String> {
    if channel == "beta" {
        endpoints.get(1).or_else(|| endpoints.first()).cloned()
    } else {
        endpoints.first().cloned()
    }
}

fn configured_endpoints(app: &tauri::AppHandle) -> Vec<String> {
    app.config()
        .plugins
        .0
        .get("updater")
        .and_then(|config| config.get("endpoints"))
        .and_then(serde_json::Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(serde_json::Value::as_str)
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
#[specta::specta]
pub fn updater_configured(app: tauri::AppHandle) -> bool {
    app.config()
        .plugins
        .0
        .get("updater")
        .is_some_and(|value| !value.is_null())
}

#[tauri::command]
#[specta::specta]
pub async fn check_update(
    app: tauri::AppHandle,
    pending: State<'_, PendingUpdate>,
    channel: String,
) -> Result<Option<UpdateInfo>, AppError> {
    let endpoints = configured_endpoints(&app);
    let Some(endpoint) = endpoint_for_channel(&endpoints, &channel) else {
        return Ok(None);
    };
    let url = tauri::Url::parse(&endpoint)
        .map_err(|error| AppError::InvalidInput(error.to_string()))?;
    let update = app
        .updater_builder()
        .endpoints(vec![url])
        .map_err(|error| AppError::Internal(error.to_string()))?
        .build()
        .map_err(|error| AppError::Internal(error.to_string()))?
        .check()
        .await
        .map_err(|error| AppError::Internal(error.to_string()))?;
    let info = update.as_ref().map(|update| UpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        body: update.body.clone(),
    });
    *pending
        .0
        .lock()
        .map_err(|_| AppError::Internal("updater lock poisoned".into()))? = update;
    Ok(info)
}

#[tauri::command]
#[specta::specta]
pub async fn install_update(
    app: tauri::AppHandle,
    pending: State<'_, PendingUpdate>,
) -> Result<(), AppError> {
    let update = pending
        .0
        .lock()
        .map_err(|_| AppError::Internal("updater lock poisoned".into()))?
        .take();
    let Some(update) = update else {
        return Err(AppError::InvalidInput("no pending update".into()));
    };
    let mut started = false;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    started = true;
                    let _ = app.emit(
                        "native://update-progress",
                        UpdateEvent::Started { content_length },
                    );
                }
                let _ = app.emit(
                    "native://update-progress",
                    UpdateEvent::Progress { chunk_length },
                );
            },
            || {
                let _ = app.emit("native://update-progress", UpdateEvent::Finished);
            },
        )
        .await
        .map_err(|error| AppError::Internal(error.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stable_and_beta_resolve_different_urls() {
        let endpoints = vec![
            "https://updates.example.com/stable/latest.json".to_string(),
            "https://updates.example.com/beta/latest.json".to_string(),
        ];
        assert_eq!(
            endpoint_for_channel(&endpoints, "stable").as_deref(),
            Some("https://updates.example.com/stable/latest.json")
        );
        assert_eq!(
            endpoint_for_channel(&endpoints, "beta").as_deref(),
            Some("https://updates.example.com/beta/latest.json")
        );
        assert_ne!(
            endpoint_for_channel(&endpoints, "stable"),
            endpoint_for_channel(&endpoints, "beta")
        );
    }
}
