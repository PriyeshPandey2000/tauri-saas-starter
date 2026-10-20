use std::fs;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};

fn read_settings(app: &AppHandle) -> serde_json::Value {
    let Ok(dir) = app.path().app_data_dir() else {
        return serde_json::Value::Null;
    };
    let Ok(raw) = fs::read_to_string(dir.join("settings.json")) else {
        return serde_json::Value::Null;
    };
    let Ok(root) = serde_json::from_str::<serde_json::Value>(&raw) else {
        return serde_json::Value::Null;
    };
    root.get("app-settings")
        .and_then(serde_json::Value::as_str)
        .and_then(|value| serde_json::from_str(value).ok())
        .unwrap_or(root)
}

fn setting_bool(app: &AppHandle, key: &str) -> bool {
    read_settings(app)
        .get("state")
        .and_then(|state| state.get(key))
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false)
}

struct Labels {
    open: &'static str,
    check_updates: &'static str,
    quit: &'static str,
    settings: &'static str,
    edit: &'static str,
}

fn labels(app: &AppHandle) -> Labels {
    // Only English is shipped today; add languages here as the i18n bundles grow.
    let _language = read_settings(app)
        .get("state")
        .and_then(|state| state.get("language"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or("en");
    Labels {
        open: "Open",
        check_updates: "Check for updates",
        quit: "Quit",
        settings: "Settings…",
        edit: "Edit",
    }
}

fn focus_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let text = labels(app);
    let open = MenuItem::with_id(app, "tray-open", text.open, true, None::<&str>)?;
    let updates = MenuItem::with_id(
        app,
        "tray-updates",
        text.check_updates,
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "tray-quit", text.quit, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &updates, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tray-open" => focus_main(app),
            "tray-updates" => {
                let _ = app.emit("native://check-updates", ());
            }
            "tray-quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

fn build_menu(app: &AppHandle) -> tauri::Result<()> {
    let text = labels(app);
    let about = PredefinedMenuItem::about(app, Some("About"), None)?;
    let settings = MenuItem::with_id(
        app,
        "menu-settings",
        text.settings,
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let quit = PredefinedMenuItem::quit(app, Some(text.quit))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let app_menu = Submenu::with_items(
        app,
        "App",
        true,
        &[&about, &separator, &settings, &separator, &quit],
    )?;

    let undo = PredefinedMenuItem::undo(app, None)?;
    let redo = PredefinedMenuItem::redo(app, None)?;
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;
    let edit_separator = PredefinedMenuItem::separator(app)?;
    let edit = Submenu::with_items(
        app,
        text.edit,
        true,
        &[
            &undo,
            &redo,
            &edit_separator,
            &cut,
            &copy,
            &paste,
            &select_all,
        ],
    )?;

    let menu = Menu::with_items(app, &[&app_menu, &edit])?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id.as_ref() == "menu-settings" {
            let _ = app.emit("native://open-settings", ());
        }
    });
    Ok(())
}

/// Called from the single-instance callback: focus and forward deep links.
pub fn handle_second_instance(app: &AppHandle, argv: &[String]) {
    focus_main(app);
    let scheme = option_env!("APP_DEEP_LINK_SCHEME").unwrap_or("tauri-saas-starter");
    for argument in argv {
        if argument.starts_with(&format!("{scheme}://")) {
            let _ = app.emit("native://deep-link", argument.clone());
        }
    }
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    build_tray(app)?;
    build_menu(app)?;
    Ok(())
}

/// Close-to-tray (default off). Reads the persisted setting on every close.
pub fn on_window_event(window: &tauri::Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        if !setting_bool(window.app_handle(), "closeToTray") {
            return;
        }
        api.prevent_close();
        let _ = window.hide();
        #[cfg(target_os = "macos")]
        {
            let _ = window
                .app_handle()
                .set_activation_policy(tauri::ActivationPolicy::Accessory);
        }
    }
}
