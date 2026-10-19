mod commands;

use specta_typescript::Typescript;
use tauri_specta::{Builder, collect_commands};

const BINDINGS_PATH: &str = "../src/shared/ipc/bindings.ts";

pub fn builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::app_info::get_app_info
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
