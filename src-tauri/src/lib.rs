mod commands;
mod markdown;

use commands::files;
use commands::markdown as md_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            md_commands::parse_markdown,
            files::read_file,
            files::write_file,
            files::list_markdown_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
