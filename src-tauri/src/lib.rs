mod commands;
mod markdown;

use commands::files;
use commands::markdown as md_commands;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            md_commands::parse_markdown,
            files::read_file,
            files::write_file,
            files::list_directory,
            files::create_file,
            files::create_directory,
            files::rename_entry,
            files::delete_entry,
        ])
        .setup(|app| {
            let zoom_in =
                MenuItem::with_id(app, "zoom-in", "Zoom In", true, Some("CmdOrCtrl+="))?;
            let zoom_out =
                MenuItem::with_id(app, "zoom-out", "Zoom Out", true, Some("CmdOrCtrl+-"))?;
            let reset_zoom =
                MenuItem::with_id(app, "reset-zoom", "Reset Zoom", true, Some("CmdOrCtrl+0"))?;

            let view_submenu = Submenu::with_items(
                app,
                "View",
                true,
                &[&zoom_in, &zoom_out, &PredefinedMenuItem::separator(app)?, &reset_zoom],
            )?;

            let menu = Menu::with_items(
                app,
                &[
                    &PredefinedMenuItem::separator(app)?,
                    &view_submenu,
                ],
            )?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                let id = event.id().as_ref();
                let payload = match id {
                    "zoom-in" => Some("zoom-in"),
                    "zoom-out" => Some("zoom-out"),
                    "reset-zoom" => Some("reset-zoom"),
                    _ => None,
                };
                if let Some(action) = payload {
                    let _ = app_handle.emit("zoom-action", action);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
