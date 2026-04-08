use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn list_markdown_files(dir: String) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(&dir);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with('.') {
            continue;
        }

        let file_path = entry.path();
        let is_dir = file_path.is_dir();

        if is_dir || file_name.ends_with(".md") || file_name.ends_with(".markdown") {
            entries.push(FileEntry {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_dir,
            });
        }
    }

    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}
