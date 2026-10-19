use serde::Serialize;
use specta::Type;

/// Errors returned by Tauri commands. Serialized as
/// `{ "kind": "...", "message": "..." }` so the frontend gets a typed union.
#[derive(Debug, thiserror::Error, Serialize, Type)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("keychain error: {0}")]
    Keychain(String),
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("internal error: {0}")]
    Internal(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_with_kind_and_message() {
        let value = serde_json::to_value(AppError::Keychain("locked".into())).unwrap();
        assert_eq!(
            value,
            serde_json::json!({ "kind": "Keychain", "message": "locked" })
        );
    }

    #[test]
    fn serializes_every_variant_with_the_same_shape() {
        for error in [
            AppError::Keychain("a".into()),
            AppError::InvalidInput("b".into()),
            AppError::Internal("c".into()),
        ] {
            let value = serde_json::to_value(error).unwrap();
            assert!(value.get("kind").is_some());
            assert!(value.get("message").is_some());
        }
    }
}
