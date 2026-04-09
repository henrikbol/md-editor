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

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    let p = PathBuf::from(&path);
    if p.exists() {
        return Err(format!("Already exists: {}", path));
    }
    fs::write(&path, "").map_err(|e| format!("Failed to create file: {}", e))
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    let p = PathBuf::from(&path);
    if p.exists() {
        return Err(format!("Already exists: {}", path));
    }
    fs::create_dir(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
pub fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    let old = PathBuf::from(&old_path);
    if !old.exists() {
        return Err(format!("Source does not exist: {}", old_path));
    }
    let new = PathBuf::from(&new_path);
    if new.exists() {
        return Err(format!("Destination already exists: {}", new_path));
    }
    if new_path.contains("..") {
        return Err("Path traversal (..) is not allowed".to_string());
    }
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))
}

#[tauri::command]
pub fn delete_entry(path: String, workspace_root: String) -> Result<(), String> {
    if path.contains("..") {
        return Err("Path traversal (..) is not allowed".to_string());
    }
    let canonical_path = fs::canonicalize(&path).map_err(|e| format!("Failed to resolve path: {}", e))?;
    let canonical_root = fs::canonicalize(&workspace_root).map_err(|e| format!("Failed to resolve workspace root: {}", e))?;
    if !canonical_path.starts_with(&canonical_root) || canonical_path == canonical_root {
        return Err("Cannot delete: path is outside workspace or is the workspace root".to_string());
    }
    if canonical_path.is_dir() {
        fs::remove_dir_all(&canonical_path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&canonical_path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[derive(Serialize)]
pub struct SearchResult {
    pub file_path: String,
    pub file_name: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

#[tauri::command]
pub fn search_in_files(dir: String, query: String) -> Result<Vec<SearchResult>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let mut results = Vec::new();

    let walker = WalkBuilder::new(&dir).build();

    for entry in walker {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        // Skip directories
        if path.is_dir() {
            continue;
        }

        // Skip files > 1MB
        if let Ok(metadata) = path.metadata() {
            if metadata.len() > 1_048_576 {
                continue;
            }
        }

        // Try to read as text (skip binary/unreadable files)
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let query_lower = query.to_lowercase();
        for (line_idx, line) in content.lines().enumerate() {
            let line_lower = line.to_lowercase();
            if let Some(pos) = line_lower.find(&query_lower) {
                results.push(SearchResult {
                    file_path: path.to_string_lossy().to_string(),
                    file_name: path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    line_number: line_idx + 1,
                    line_content: line.to_string(),
                    match_start: pos,
                    match_end: pos + query.len(),
                });
            }
        }
    }

    Ok(results)
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

    // ── create_file tests ──

    #[test]
    fn test_create_file() {
        let tmp = TempDir::new().unwrap();
        let file_path = tmp.path().join("new_file.txt");
        let path_str = file_path.to_string_lossy().to_string();

        create_file(path_str.clone()).unwrap();

        assert!(file_path.exists());
        assert_eq!(fs::read_to_string(&file_path).unwrap(), "");
    }

    #[test]
    fn test_create_file_already_exists() {
        let tmp = TempDir::new().unwrap();
        let file_path = tmp.path().join("existing.txt");
        fs::write(&file_path, "content").unwrap();

        let result = create_file(file_path.to_string_lossy().to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Already exists"));
    }

    #[test]
    fn test_create_file_empty_path() {
        let result = create_file("".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    // ── create_directory tests ──

    #[test]
    fn test_create_directory() {
        let tmp = TempDir::new().unwrap();
        let dir_path = tmp.path().join("new_dir");
        let path_str = dir_path.to_string_lossy().to_string();

        create_directory(path_str).unwrap();

        assert!(dir_path.is_dir());
    }

    #[test]
    fn test_create_directory_already_exists() {
        let tmp = TempDir::new().unwrap();
        let dir_path = tmp.path().join("existing_dir");
        fs::create_dir(&dir_path).unwrap();

        let result = create_directory(dir_path.to_string_lossy().to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Already exists"));
    }

    // ── rename_entry tests ──

    #[test]
    fn test_rename_entry() {
        let tmp = TempDir::new().unwrap();
        let old = tmp.path().join("old.txt");
        let new = tmp.path().join("new.txt");
        fs::write(&old, "hello").unwrap();

        rename_entry(
            old.to_string_lossy().to_string(),
            new.to_string_lossy().to_string(),
        )
        .unwrap();

        assert!(!old.exists());
        assert!(new.exists());
        assert_eq!(fs::read_to_string(&new).unwrap(), "hello");
    }

    #[test]
    fn test_rename_to_existing() {
        let tmp = TempDir::new().unwrap();
        let old = tmp.path().join("old.txt");
        let new = tmp.path().join("new.txt");
        fs::write(&old, "").unwrap();
        fs::write(&new, "").unwrap();

        let result = rename_entry(
            old.to_string_lossy().to_string(),
            new.to_string_lossy().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already exists"));
    }

    #[test]
    fn test_rename_nonexistent_source() {
        let tmp = TempDir::new().unwrap();
        let result = rename_entry(
            tmp.path().join("nope.txt").to_string_lossy().to_string(),
            tmp.path().join("new.txt").to_string_lossy().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_rename_path_traversal() {
        let tmp = TempDir::new().unwrap();
        let old = tmp.path().join("old.txt");
        fs::write(&old, "").unwrap();

        let result = rename_entry(
            old.to_string_lossy().to_string(),
            tmp.path().join("..").join("escape.txt").to_string_lossy().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("traversal"));
    }

    // ── delete_entry tests ──

    #[test]
    fn test_delete_file() {
        let tmp = TempDir::new().unwrap();
        let file = tmp.path().join("doomed.txt");
        fs::write(&file, "bye").unwrap();

        delete_entry(
            file.to_string_lossy().to_string(),
            tmp.path().to_string_lossy().to_string(),
        )
        .unwrap();

        assert!(!file.exists());
    }

    #[test]
    fn test_delete_directory() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path().join("doomed_dir");
        fs::create_dir(&dir).unwrap();
        fs::write(dir.join("child.txt"), "").unwrap();

        delete_entry(
            dir.to_string_lossy().to_string(),
            tmp.path().to_string_lossy().to_string(),
        )
        .unwrap();

        assert!(!dir.exists());
    }

    #[test]
    fn test_delete_outside_workspace() {
        let workspace = TempDir::new().unwrap();
        let outside = TempDir::new().unwrap();
        let file = outside.path().join("secret.txt");
        fs::write(&file, "secret").unwrap();

        let result = delete_entry(
            file.to_string_lossy().to_string(),
            workspace.path().to_string_lossy().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside workspace"));
    }

    #[test]
    fn test_delete_workspace_root() {
        let tmp = TempDir::new().unwrap();

        let result = delete_entry(
            tmp.path().to_string_lossy().to_string(),
            tmp.path().to_string_lossy().to_string(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside workspace or is the workspace root"));
    }

    #[test]
    fn test_delete_nonexistent() {
        let tmp = TempDir::new().unwrap();

        let result = delete_entry(
            tmp.path().join("nope.txt").to_string_lossy().to_string(),
            tmp.path().to_string_lossy().to_string(),
        );
        assert!(result.is_err());
    }

    // ── search_in_files tests ──

    #[test]
    fn test_search_empty_query() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("file.txt"), "hello world").unwrap();

        let results = search_in_files(tmp.path().to_string_lossy().to_string(), "".to_string()).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_finds_match() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("file.txt"), "hello world\nfoo bar\nhello again").unwrap();

        let results = search_in_files(tmp.path().to_string_lossy().to_string(), "hello".to_string()).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].line_number, 1);
        assert_eq!(results[0].match_start, 0);
        assert_eq!(results[0].match_end, 5);
        assert_eq!(results[1].line_number, 3);
    }

    #[test]
    fn test_search_case_insensitive() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("file.txt"), "Hello World").unwrap();

        let results = search_in_files(tmp.path().to_string_lossy().to_string(), "hello".to_string()).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].line_content, "Hello World");
    }

    #[test]
    fn test_search_no_results() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("file.txt"), "hello world").unwrap();

        let results = search_in_files(tmp.path().to_string_lossy().to_string(), "xyz".to_string()).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_multiple_files() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("a.txt"), "match here").unwrap();
        fs::write(tmp.path().join("b.txt"), "no luck").unwrap();
        fs::write(tmp.path().join("c.txt"), "another match").unwrap();

        let results = search_in_files(tmp.path().to_string_lossy().to_string(), "match".to_string()).unwrap();
        assert_eq!(results.len(), 2);
    }
}
