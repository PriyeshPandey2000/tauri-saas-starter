mod commands;
mod error;

use specta_typescript::Typescript;
use tauri_specta::{Builder, collect_commands};

const BINDINGS_PATH: &str = "../src/shared/ipc/bindings.ts";

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
    builder
        .export(Typescript::default(), BINDINGS_PATH)
        .expect("failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
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
            .export(Typescript::default(), BINDINGS_PATH)
            .expect("failed to export typescript bindings");
    }
}
