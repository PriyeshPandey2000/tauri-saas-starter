use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::time::{Duration, Instant};

use tauri::Manager;

static ACTIVE: AtomicBool = AtomicBool::new(false);
static REPORTED: AtomicBool = AtomicBool::new(false);
static ERRORS: AtomicUsize = AtomicUsize::new(0);
static JS_SHOWN: AtomicBool = AtomicBool::new(false);
static START: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

pub fn requested() -> bool {
    std::env::args().any(|argument| argument == "--smoke-test")
}

#[tauri::command]
#[specta::specta]
pub fn smoke_requested() -> bool {
    let active = ACTIVE.load(Ordering::SeqCst);
    println!("[smoke] requested={active}");
    active
}

#[tauri::command]
#[specta::specta]
pub fn smoke_report(errors: u32, shown: bool, messages: Vec<String>) {
    if !ACTIVE.load(Ordering::SeqCst) {
        return;
    }
    println!("[smoke] report errors={errors} shown={shown}");
    for message in messages.iter().take(5) {
        let clipped: String = message.chars().take(300).collect();
        println!("[smoke] webview error: {clipped}");
    }
    ERRORS.store(errors as usize, Ordering::SeqCst);
    JS_SHOWN.store(shown, Ordering::SeqCst);
    REPORTED.store(true, Ordering::SeqCst);
}

fn rss_kb() -> u64 {
    #[cfg(unix)]
    {
        let pid = std::process::id().to_string();
        if let Ok(output) = std::process::Command::new("ps")
            .args(["-o", "rss=", "-p", &pid])
            .output()
        {
            return String::from_utf8_lossy(&output.stdout)
                .trim()
                .parse()
                .unwrap_or(0);
        }
    }
    #[cfg(windows)]
    {
        let script = format!("(Get-Process -Id {}).WorkingSet64 / 1024", std::process::id());
        if let Ok(output) = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            return text.trim().parse::<f64>().map(|kb| kb as u64).unwrap_or(0);
        }
    }
    0
}

pub fn init(app: &tauri::AppHandle) {
    if !requested() {
        return;
    }
    ACTIVE.store(true, Ordering::SeqCst);
    let start = *START.get_or_init(Instant::now);
    let _ = app;

    let handle = app.clone();
    std::thread::spawn(move || {
        // Cold CI runners need several seconds to spawn the webview; the report
        // arrives about 2.5 s after the page boots. Stay under the 15 s budget.
        let deadline = start + Duration::from_secs(12);
        let mut shown_after: Option<u128> = None;
        while Instant::now() < deadline {
            let visible = handle
                .get_webview_window("main")
                .and_then(|window| window.is_visible().ok())
                .unwrap_or(false);
            if visible && shown_after.is_none() {
                shown_after = Some(start.elapsed().as_millis());
            }
            if REPORTED.load(Ordering::SeqCst) && shown_after.is_some() {
                break;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        let reported = REPORTED.load(Ordering::SeqCst);
        let errors = ERRORS.load(Ordering::SeqCst);
        let shown = shown_after.is_some() || (reported && JS_SHOWN.load(Ordering::SeqCst));
        if let Some(millis) = shown_after {
            println!("[smoke] window shown after {millis}ms");
        } else {
            println!("[smoke] window NOT shown");
        }
        if reported && errors == 0 {
            println!("[smoke] zero console errors and zero unhandled rejections");
        } else if !reported {
            println!("[smoke] no webview report received");
        } else {
            println!("[smoke] console errors: {errors}");
        }
        println!("[smoke] rss_kb={}", rss_kb());
        let code = if shown && reported && errors == 0 { 0 } else { 1 };
        std::process::exit(code);
    });
}
