use ignore::WalkBuilder;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
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
                extension: None,
            });
        }
    }

    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

#[tauri::command]
pub fn list_directory(dir: String) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(&dir);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }

    let walker = WalkBuilder::new(&path)
        .max_depth(Some(1))
        .build();

    let mut entries = Vec::new();

    for result in walker {
        let entry = result.map_err(|e| format!("Walk error: {}", e))?;

        // Skip the root directory itself (depth 0)
        if entry.depth() == 0 {
            continue;
        }

        let entry_path = entry.path();
        let is_dir = entry_path.is_dir();
        let name = entry_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        let extension = entry_path
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        entries.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            extension,
        });
    }

    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_list_directory_returns_all_file_types() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        fs::write(dir.join("readme.md"), "# Hello").unwrap();
        fs::write(dir.join("script.js"), "console.log()").unwrap();
        fs::write(dir.join("style.css"), "body {}").unwrap();
        fs::create_dir(dir.join("subdir")).unwrap();

        let result = list_directory(dir.to_string_lossy().to_string()).unwrap();

        assert_eq!(result.len(), 4);
        // All file types should be present
        let names: Vec<&str> = result.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"readme.md"));
        assert!(names.contains(&"script.js"));
        assert!(names.contains(&"style.css"));
        assert!(names.contains(&"subdir"));
    }

    #[test]
    fn test_list_directory_sorting_dirs_first_then_alpha() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        fs::write(dir.join("zebra.txt"), "").unwrap();
        fs::write(dir.join("apple.txt"), "").unwrap();
        fs::create_dir(dir.join("Beta")).unwrap();
        fs::create_dir(dir.join("alpha_dir")).unwrap();

        let result = list_directory(dir.to_string_lossy().to_string()).unwrap();

        assert_eq!(result.len(), 4);
        // Directories first, case-insensitive alpha
        assert!(result[0].is_dir);
        assert!(result[1].is_dir);
        assert_eq!(result[0].name, "alpha_dir");
        assert_eq!(result[1].name, "Beta");
        // Then files
        assert!(!result[2].is_dir);
        assert!(!result[3].is_dir);
        assert_eq!(result[2].name, "apple.txt");
        assert_eq!(result[3].name, "zebra.txt");
    }

    #[test]
    fn test_list_directory_excludes_root_entry() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        fs::write(dir.join("file.txt"), "").unwrap();

        let result = list_directory(dir.to_string_lossy().to_string()).unwrap();

        // Root directory itself should not appear
        let root_name = dir.file_name().unwrap().to_string_lossy().to_string();
        assert!(!result.iter().any(|e| e.name == root_name));
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_list_directory_empty_dir() {
        let tmp = TempDir::new().unwrap();

        let result = list_directory(tmp.path().to_string_lossy().to_string()).unwrap();

        assert!(result.is_empty());
    }

    #[test]
    fn test_list_directory_nonexistent_path() {
        let result = list_directory("/nonexistent/path/that/does/not/exist".to_string());

        assert!(result.is_err());
    }

    #[test]
    fn test_list_directory_extensions() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path();

        fs::write(dir.join("readme.md"), "").unwrap();
        fs::write(dir.join("no_ext"), "").unwrap();
        fs::create_dir(dir.join("subdir")).unwrap();

        let result = list_directory(dir.to_string_lossy().to_string()).unwrap();

        let md_entry = result.iter().find(|e| e.name == "readme.md").unwrap();
        assert_eq!(md_entry.extension, Some("md".to_string()));

        let no_ext_entry = result.iter().find(|e| e.name == "no_ext").unwrap();
        assert_eq!(no_ext_entry.extension, None);

        let dir_entry = result.iter().find(|e| e.name == "subdir").unwrap();
        assert_eq!(dir_entry.extension, None);
    }
}
