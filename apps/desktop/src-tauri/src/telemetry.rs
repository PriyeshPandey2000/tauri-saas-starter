use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::LazyLock;

use regex::Regex;
use serde_json::{Map, Value};
use tauri::Manager;

pub static CONSENT: AtomicBool = AtomicBool::new(false);

static EMAIL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}").expect("email regex")
});
static BEARER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)bearer\s+[A-Za-z0-9._~+/\-]+=*").expect("bearer regex")
});
static ASSIGNMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(password|passwd|secret|token|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;&]+")
        .expect("assignment regex")
});
static QUERY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"\?[^\s"']*"#).expect("query regex"));

fn sensitive_key(key: &str) -> bool {
    let key = key.to_ascii_lowercase();
    key.contains("password")
        || key.contains("secret")
        || key.contains("token")
        || key.contains("authorization")
        || key.contains("cookie")
        || key.contains("api_key")
        || key.contains("apikey")
        || key.contains("email")
        || key == "installid"
        || key == "install_id"
}

/// Scrub free text: emails, credentials, query strings and the OS username.
pub fn scrub_text(input: &str) -> String {
    let mut text = EMAIL.replace_all(input, "[email]").into_owned();
    text = BEARER.replace_all(&text, "Bearer [Filtered]").into_owned();
    text = ASSIGNMENT
        .replace_all(&text, "$1=[Filtered]")
        .into_owned();
    text = QUERY.replace_all(&text, "?[Filtered]").into_owned();

    for user in [std::env::var("USER").ok(), std::env::var("USERNAME").ok()]
        .into_iter()
        .flatten()
    {
        if user.len() >= 2 {
            text = text.replace(&user, "[user]");
            text = text.replace(&format!("/Users/{user}"), "/Users/[user]");
            text = text.replace(&format!("/home/{user}"), "/home/[user]");
            text = text.replace(
                &format!("C:\\Users\\{user}"),
                "C:\\Users\\[user]",
            );
        }
    }
    text
}

/// Recursively scrub JSON values; sensitive keys are replaced wholesale.
pub fn scrub_json(value: &Value) -> Value {
    match value {
        Value::String(text) => Value::String(scrub_text(text)),
        Value::Array(items) => Value::Array(items.iter().map(scrub_json).collect()),
        Value::Object(map) => Value::Object(scrub_map(map)),
        other => other.clone(),
    }
}

fn scrub_btree(
    map: &std::collections::BTreeMap<String, Value>,
) -> std::collections::BTreeMap<String, Value> {
    let mut clean = std::collections::BTreeMap::new();
    for (key, value) in map {
        if sensitive_key(key) {
            clean.insert(key.clone(), Value::String("[Filtered]".into()));
        } else {
            clean.insert(key.clone(), scrub_json(value));
        }
    }
    clean
}

fn scrub_map(map: &Map<String, Value>) -> Map<String, Value> {
    let mut clean = Map::new();
    for (key, value) in map {
        if sensitive_key(key) {
            clean.insert(key.clone(), Value::String("[Filtered]".into()));
        } else {
            clean.insert(key.clone(), scrub_json(value));
        }
    }
    clean
}

fn scrub_path(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    if let Some(index) = normalized.find("/src/") {
        return normalized[(index + 1)..].to_string();
    }
    normalized
        .rsplit('/')
        .next()
        .filter(|name| !name.is_empty())
        .unwrap_or("[path]")
        .to_string()
}

fn scrub_stacktrace(stacktrace: Option<&mut sentry::protocol::Stacktrace>) {
    let Some(stacktrace) = stacktrace else {
        return;
    };
    for frame in &mut stacktrace.frames {
        if let Some(filename) = frame.filename.take() {
            frame.filename = Some(scrub_path(&filename));
        }
        if frame.abs_path.is_some() {
            frame.abs_path = frame.filename.clone();
        }
    }
}

fn scrub_user(event: &mut sentry::protocol::Event<'static>) {
    if let Some(user) = event.user.take() {
        event.user = Some(sentry::protocol::User {
            id: user.id,
            email: None,
            username: None,
            ip_address: None,
            other: Default::default(),
        });
    }
}

/// `before_send`: drop everything when consent is off, otherwise scrub.
pub fn before_send(
    event: sentry::protocol::Event<'static>,
) -> Option<sentry::protocol::Event<'static>> {
    if !CONSENT.load(Ordering::SeqCst) {
        return None;
    }
    Some(scrub_event(event))
}

pub fn scrub_event(
    mut event: sentry::protocol::Event<'static>,
) -> sentry::protocol::Event<'static> {
    event.request = None;
    event.server_name = None;
    event.message = event.message.map(|message| scrub_text(&message));
    event.culprit = event.culprit.map(|culprit| scrub_text(&culprit));
    event.transaction = event.transaction.map(|value| scrub_text(&value));
    event.logentry = None;
    event.contexts = Default::default();
    scrub_user(&mut event);

    for exception in &mut event.exception {
        if let Some(message) = exception.value.take() {
            exception.value = Some(scrub_text(&message));
        }
        scrub_stacktrace(exception.stacktrace.as_mut());
    }
    scrub_stacktrace(event.stacktrace.as_mut());
    for thread in &mut event.threads {
        scrub_stacktrace(thread.stacktrace.as_mut());
        scrub_stacktrace(thread.raw_stacktrace.as_mut());
    }

    for breadcrumb in &mut event.breadcrumbs {
        if let Some(message) = breadcrumb.message.take() {
            breadcrumb.message = Some(scrub_text(&message));
        }
        breadcrumb.data = scrub_btree(&breadcrumb.data);
    }

    event.extra = scrub_btree(&event.extra);
    event.tags = event
        .tags
        .into_iter()
        .map(|(key, value)| {
            if sensitive_key(&key) {
                (key, "[Filtered]".to_string())
            } else {
                (key, scrub_text(&value))
            }
        })
        .collect();
    event
}

fn read_settings_consent(app: &tauri::AppHandle) -> bool {
    let Ok(dir) = app.path().app_data_dir() else {
        return false;
    };
    let Ok(raw) = fs::read_to_string(dir.join("settings.json")) else {
        return false;
    };
    let Ok(root) = serde_json::from_str::<Value>(&raw) else {
        return false;
    };
    let inner = root
        .get("app-settings")
        .and_then(Value::as_str)
        .and_then(|value| serde_json::from_str::<Value>(value).ok())
        .unwrap_or(root);
    inner
        .get("state")
        .and_then(|state| state.get("telemetryConsent"))
        .and_then(Value::as_str)
        .is_some_and(|value| value == "granted")
}

/// Read the stored consent, then start the client (no sessions, no PII).
pub fn init(app: &tauri::AppHandle) {
    CONSENT.store(read_settings_consent(app), Ordering::SeqCst);
    let Some(dsn) = option_env!("SENTRY_DSN") else {
        return;
    };
    // `sentry::init` installs the panic hook and default integrations.
    let mut options = sentry::ClientOptions::new()
        .dsn(dsn)
        .auto_session_tracking(false)
        .send_default_pii(false)
        .before_send(before_send)
        .release(option_env!("CARGO_PKG_VERSION").unwrap_or("0.0.0"));
    if let Some(environment) = option_env!("SENTRY_ENVIRONMENT") {
        options = options.environment(environment);
    }
    let guard = sentry::init(options);
    // Keep the client alive for the process lifetime.
    std::mem::forget(guard);
}

pub fn set_consent(granted: bool) {
    CONSENT.store(granted, Ordering::SeqCst);
}

/// Newest log file in the app log dir, truncated to the last ~200 KB.
pub fn read_log_tail(app: &tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_log_dir().map_err(|error| error.to_string())?;
    let mut newest: Option<(std::time::SystemTime, std::path::PathBuf)> = None;
    for entry in fs::read_dir(dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("log") {
            continue;
        }
        let modified = entry
            .metadata()
            .and_then(|meta| meta.modified())
            .map_err(|error| error.to_string())?;
        if newest.as_ref().is_none_or(|(time, _)| modified > *time) {
            newest = Some((modified, path));
        }
    }
    let Some((_, path)) = newest else {
        return Ok(String::new());
    };
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let start = text.len().saturating_sub(200_000);
    let boundary = text
        .char_indices()
        .find(|(index, _)| *index >= start)
        .map(|(index, _)| index)
        .unwrap_or(0);
    Ok(scrub_text(&text[boundary..]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sentry::protocol::{Breadcrumb, Event, Exception, User};

    #[test]
    fn text_scrubbing_removes_emails_tokens_and_queries() {
        let text = scrub_text(
            "mail ada@example.com token=abc123 https://x.test/cb?code=secret&state=1",
        );
        assert!(!text.contains("ada@example.com"));
        assert!(!text.contains("abc123"));
        assert!(!text.contains("code=secret"));
        assert!(text.contains("[email]"));
    }

    #[test]
    fn event_scrubbing_drops_bodies_headers_and_user_email() {
        let mut event = Event::default();
        event.message = Some("Ada <ada@example.com> failed".into());
        event.user = Some(User {
            id: Some("user-123".into()),
            email: Some("ada@example.com".into()),
            username: Some("ada".into()),
            ..Default::default()
        });
        event.extra.insert(
            "token".into(),
            Value::String("secret-token".into()),
        );
        event.extra.insert(
            "installId".into(),
            Value::String("install-abc".into()),
        );
        event.breadcrumbs.values.push(Breadcrumb {
            message: Some("GET https://api.test/x?key=abc".into()),
            data: std::collections::BTreeMap::from_iter([(
                "cookie".to_string(),
                Value::String("session=abc".into()),
            )]),
            ..Default::default()
        });
        event.exception = vec![Exception {
            value: Some("Bearer abc123 for ada@example.com".into()),
            ..Default::default()
        }]
        .into();

        let clean = scrub_event(event);
        assert!(clean.request.is_none());
        let user = clean.user.expect("user kept");
        assert_eq!(user.id.as_deref(), Some("user-123"));
        assert!(user.email.is_none());
        assert!(user.username.is_none());
        assert_eq!(
            clean.extra.get("token"),
            Some(&Value::String("[Filtered]".into()))
        );
        assert_eq!(
            clean.extra.get("installId"),
            Some(&Value::String("[Filtered]".into()))
        );
        assert!(!clean.message.unwrap_or_default().contains("ada@example.com"));
        let breadcrumb = clean.breadcrumbs.first().expect("breadcrumb");
        assert!(!breadcrumb.message.clone().unwrap_or_default().contains("key=abc"));
        assert_eq!(
            breadcrumb.data.get("cookie"),
            Some(&Value::String("[Filtered]".into()))
        );
        assert!(!clean.exception[0]
            .value
            .clone()
            .unwrap_or_default()
            .contains("abc123"));
    }

    #[test]
    fn stack_frames_lose_absolute_paths() {
        use sentry::protocol::{Frame, Stacktrace};

        let mut event = Event::default();
        event.exception = vec![Exception {
            stacktrace: Some(Stacktrace {
                frames: vec![Frame {
                    filename: Some("/Users/ada/project/src/main.rs".into()),
                    abs_path: Some("/Users/ada/project/src/main.rs".into()),
                    ..Default::default()
                }],
                ..Default::default()
            }),
            ..Default::default()
        }]
        .into();
        event.threads.values.push(sentry::protocol::Thread {
            stacktrace: Some(Stacktrace {
                frames: vec![Frame {
                    filename: Some("/home/ada/.cargo/registry/lib.rs".into()),
                    abs_path: Some("/home/ada/.cargo/registry/lib.rs".into()),
                    ..Default::default()
                }],
                ..Default::default()
            }),
            ..Default::default()
        });

        let clean = scrub_event(event);
        let frame = &clean.exception[0]
            .stacktrace
            .as_ref()
            .expect("stacktrace")
            .frames[0];
        assert_eq!(frame.filename.as_deref(), Some("src/main.rs"));
        assert_eq!(frame.abs_path.as_deref(), Some("src/main.rs"));
        let thread_frame = &clean.threads[0]
            .stacktrace
            .as_ref()
            .expect("thread stacktrace")
            .frames[0];
        assert_eq!(thread_frame.filename.as_deref(), Some("lib.rs"));
        assert!(!format!("{clean:?}").contains("/Users/ada"));
    }

    #[test]
    fn before_send_fails_closed() {
        CONSENT.store(false, Ordering::SeqCst);
        assert!(before_send(Event::default()).is_none());
        CONSENT.store(true, Ordering::SeqCst);
        assert!(before_send(Event::default()).is_some());
        CONSENT.store(false, Ordering::SeqCst);
    }
}
