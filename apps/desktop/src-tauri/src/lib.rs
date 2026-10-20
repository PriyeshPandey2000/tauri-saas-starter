mod commands;
mod error;
mod native;
mod smoke;
mod telemetry;

use specta_typescript::Typescript;
use tauri::Manager;
use tauri_specta::{Builder, collect_commands};

fn bindings_path() -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../src/shared/ipc/bindings.ts")
}

const TYPED_ERROR_IMPL: &str = r#"async function typedError<T, E>(result: Promise<T>): Promise<{ status: "ok"; data: T } | { status: "error"; error: E }> {
    try {
        return { status: "ok", data: await result };
    } catch (e) {
        if (e instanceof Error) throw e;
        return { status: "error", error: e as E };
    }
}"#;

fn base_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .typ::<error::AppError>()
        .typed_error_impl(TYPED_ERROR_IMPL)
}

#[cfg(debug_assertions)]
pub fn builder() -> Builder<tauri::Wry> {
    base_builder().commands(collect_commands![
        commands::app_info::get_app_info,
        commands::secure_storage::secure_set,
        commands::secure_storage::secure_get,
        commands::secure_storage::secure_delete,
        commands::telemetry::set_telemetry_consent,
        commands::telemetry::read_log_tail,
        commands::updater::updater_configured,
        commands::updater::check_update,
        commands::updater::install_update,
        commands::telemetry::trigger_test_panic,
        smoke::smoke_report,
        smoke::smoke_requested
    ])
}

#[cfg(not(debug_assertions))]
pub fn builder() -> Builder<tauri::Wry> {
    base_builder().commands(collect_commands![
        commands::app_info::get_app_info,
        commands::secure_storage::secure_set,
        commands::secure_storage::secure_get,
        commands::secure_storage::secure_delete,
        commands::telemetry::set_telemetry_consent,
        commands::telemetry::read_log_tail,
        commands::updater::updater_configured,
        commands::updater::check_update,
        commands::updater::install_update,
        smoke::smoke_report,
        smoke::smoke_requested
    ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = builder();

    #[cfg(debug_assertions)]
    if let Err(error) = builder.export(Typescript::default(), bindings_path()) {
        eprintln!("warning: failed to export TypeScript bindings: {error}");
    }

    tauri::Builder::default()
        // Must be the first plugin so a second process exits immediately.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            native::handle_second_instance(app, &argv);
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("app".into()),
                    },
                )])
                .max_file_size(2_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
                .build(),
        )
        .invoke_handler(builder.invoke_handler())
        .on_window_event(native::on_window_event)
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            telemetry::init(app.handle());
            native::setup(app.handle())?;
            smoke::init(app.handle());
            // The updater plugin needs `plugins.updater`; without it the plugin
            // panics at startup. Register it only when the build injected a feed.
            if commands::updater::updater_configured(app.handle().clone()) {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.manage(commands::updater::PendingUpdate(std::sync::Mutex::new(None)));
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_bindings() {
        builder()
            .export(Typescript::default(), bindings_path())
            .expect("failed to export typescript bindings");
    }
}
