use crate::markdown;

#[tauri::command]
pub fn parse_markdown(text: String) -> String {
    markdown::render(&text)
}
