use comrak::{markdown_to_html, Options};
use syntect::highlighting::ThemeSet;
use syntect::html::highlighted_html_for_string;
use syntect::parsing::SyntaxSet;
use std::sync::LazyLock;

static SYNTAX_SET: LazyLock<SyntaxSet> = LazyLock::new(SyntaxSet::load_defaults_newlines);
static THEME_SET: LazyLock<ThemeSet> = LazyLock::new(ThemeSet::load_defaults);

pub fn render(input: &str) -> String {
    let mut options = Options::default();
    options.extension.strikethrough = true;
    options.extension.table = true;
    options.extension.autolink = true;
    options.extension.tasklist = true;
    options.extension.header_id_prefix = Some(String::new());
    options.render.r#unsafe = true;

    let html = markdown_to_html(input, &options);
    highlight_code_blocks(&html)
}

fn highlight_code_blocks(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut remaining = html;

    while let Some(pre_start) = remaining.find("<pre><code") {
        result.push_str(&remaining[..pre_start]);

        let after_pre = &remaining[pre_start..];
        let Some(code_end) = after_pre.find("</code></pre>") else {
            result.push_str(after_pre);
            return result;
        };

        let block = &after_pre[..code_end + "</code></pre>".len()];
        let lang = extract_language(block);
        let code = extract_code_content(block);
        let decoded = decode_html_entities(&code);

        if let Some(highlighted) = try_highlight(&decoded, &lang) {
            result.push_str(&highlighted);
        } else {
            result.push_str(block);
        }

        remaining = &after_pre[code_end + "</code></pre>".len()..];
    }

    result.push_str(remaining);
    result
}

fn extract_language(block: &str) -> String {
    if let Some(class_start) = block.find("class=\"") {
        let after_class = &block[class_start + 7..];
        if let Some(class_end) = after_class.find('"') {
            let class = &after_class[..class_end];
            if let Some(lang) = class.strip_prefix("language-") {
                return lang.to_string();
            }
        }
    }
    String::new()
}

fn extract_code_content(block: &str) -> String {
    if let Some(gt_pos) = block.find('>') {
        let after_first_tag = &block[gt_pos + 1..];
        if let Some(gt2) = after_first_tag.find('>') {
            let content_start = &after_first_tag[gt2 + 1..];
            if let Some(end) = content_start.find("</code>") {
                return content_start[..end].to_string();
            }
        }
        // Single tag case: <pre><code>content</code></pre>
        if let Some(end) = after_first_tag.find("</code>") {
            return after_first_tag[..end].to_string();
        }
    }
    String::new()
}

fn decode_html_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

fn try_highlight(code: &str, lang: &str) -> Option<String> {
    if lang.is_empty() {
        return None;
    }

    let ss = &*SYNTAX_SET;
    let ts = &*THEME_SET;
    let syntax = ss.find_syntax_by_token(lang)?;
    let theme = &ts.themes["base16-ocean.dark"];

    let highlighted = highlighted_html_for_string(code, ss, syntax, theme).ok()?;
    Some(format!("<div class=\"highlighted-code\">{}</div>", highlighted))
}
