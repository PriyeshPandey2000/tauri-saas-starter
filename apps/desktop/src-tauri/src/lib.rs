mod commands;
mod error;

use specta_typescript::Typescript;
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

pub fn builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .typ::<error::AppError>()
        .typed_error_impl(TYPED_ERROR_IMPL)
        .commands(collect_commands![
            commands::app_info::get_app_info,
            commands::secure_storage::secure_set,
            commands::secure_storage::secure_get,
            commands::secure_storage::secure_delete
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
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
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
