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
            files::search_in_files,
        ])
        .setup(|app| {
            // File menu
            let new_file =
                MenuItem::with_id(app, "new-file", "New File", true, Some("CmdOrCtrl+N"))?;
            let save_item =
                MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?;
            let save_as =
                MenuItem::with_id(app, "save-as", "Save As…", true, Some("CmdOrCtrl+Shift+S"))?;
            let file_submenu = Submenu::with_items(
                app,
                "File",
                true,
                &[&new_file, &PredefinedMenuItem::separator(app)?, &save_item, &save_as],
            )?;

            // Edit menu
            let undo =
                MenuItem::with_id(app, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
            let redo =
                MenuItem::with_id(app, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?;
            let edit_submenu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &undo,
                    &redo,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;

            // View menu
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

            // Help menu
            let keyboard_shortcuts =
                MenuItem::with_id(app, "keyboard-shortcuts", "Keyboard Shortcuts", true, None::<&str>)?;
            let help_submenu = Submenu::with_items(
                app,
                "Help",
                true,
                &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &keyboard_shortcuts,
                ],
            )?;

            // App menu (macOS)
            let preferences =
                MenuItem::with_id(app, "preferences", "Preferences", true, Some("CmdOrCtrl+,"))?;
            let app_submenu = Submenu::with_items(
                app,
                "MD Editor",
                true,
                &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &preferences,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?;

            let menu = Menu::with_items(
                app,
                &[&app_submenu, &file_submenu, &edit_submenu, &view_submenu, &help_submenu],
            )?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                let id = event.id().as_ref();
                match id {
                    "zoom-in" | "zoom-out" | "reset-zoom" => {
                        let _ = app_handle.emit("zoom-action", id);
                    }
                    "new-file" | "save" | "save-as" | "undo" | "redo" | "keyboard-shortcuts" | "preferences" => {
                        let _ = app_handle.emit("menu-action", id);
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
