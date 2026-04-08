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
    options.render.sourcepos = true;

    let html = markdown_to_html(input, &options);
    highlight_code_blocks(&html)
}

fn highlight_code_blocks(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut remaining = html;

    // Match <pre with optional attributes (e.g. data-sourcepos) followed by ><code
    while let Some(pre_start) = remaining.find("<pre") {
        let after_pre_tag = &remaining[pre_start + 4..];

        // Check this is actually a <pre> or <pre ...> followed by <code
        let Some(pre_close) = after_pre_tag.find('>') else {
            result.push_str(&remaining[..pre_start + 4]);
            remaining = after_pre_tag;
            continue;
        };

        let after_pre_close = &after_pre_tag[pre_close + 1..];
        if !after_pre_close.starts_with("<code") {
            result.push_str(&remaining[..pre_start + 4 + pre_close + 1]);
            remaining = after_pre_close;
            continue;
        }

        result.push_str(&remaining[..pre_start]);

        let block_start = &remaining[pre_start..];
        let Some(code_end) = block_start.find("</code></pre>") else {
            result.push_str(block_start);
            return result;
        };

        let block = &block_start[..code_end + "</code></pre>".len()];
        let pre_attrs = &after_pre_tag[..pre_close];
        let sourcepos = extract_attribute(pre_attrs, "data-sourcepos");
        let lang = extract_language(block);
        let code = extract_code_content(block);
        let decoded = decode_html_entities(&code);

        if let Some(highlighted) = try_highlight(&decoded, &lang, &sourcepos) {
            result.push_str(&highlighted);
        } else {
            result.push_str(block);
        }

        remaining = &block_start[code_end + "</code></pre>".len()..];
    }

    result.push_str(remaining);
    result
}

fn extract_attribute(attrs: &str, name: &str) -> String {
    let pattern = format!("{}=\"", name);
    if let Some(start) = attrs.find(&pattern) {
        let after = &attrs[start + pattern.len()..];
        if let Some(end) = after.find('"') {
            return after[..end].to_string();
        }
    }
    String::new()
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

fn try_highlight(code: &str, lang: &str, sourcepos: &str) -> Option<String> {
    if lang.is_empty() {
        return None;
    }

    let ss = &*SYNTAX_SET;
    let ts = &*THEME_SET;
    let syntax = ss.find_syntax_by_token(lang)?;
    let theme = &ts.themes["base16-ocean.dark"];

    let highlighted = highlighted_html_for_string(code, ss, syntax, theme).ok()?;
    let sp_attr = if sourcepos.is_empty() {
        String::new()
    } else {
        format!(" data-sourcepos=\"{}\"", sourcepos)
    };
    Some(format!("<div class=\"highlighted-code\"{}>{}</div>", sp_attr, highlighted))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sourcepos_on_block_elements() {
        let input = "# Hello\n\nA paragraph.\n\n```rust\nlet x = 1;\n```\n\n> quote\n";
        let html = render(input);
        assert!(html.contains("data-sourcepos"));
        assert!(html.contains("<h1 data-sourcepos="));
        assert!(html.contains("<p data-sourcepos="));
        assert!(html.contains("<blockquote data-sourcepos="));
    }

    #[test]
    fn test_highlighted_code_preserves_sourcepos() {
        let input = "```javascript\nconsole.log('hi');\n```\n";
        let html = render(input);
        assert!(html.contains("highlighted-code"), "should be highlighted: {}", html);
        assert!(html.contains("data-sourcepos"), "should have sourcepos: {}", html);
        assert!(html.contains("<div class=\"highlighted-code\" data-sourcepos="));
    }

    #[test]
    fn test_code_block_without_lang_preserves_sourcepos() {
        let input = "```\nplain code\n```\n";
        let html = render(input);
        assert!(html.contains("data-sourcepos"));
        // No language means no highlighting, so raw <pre> is preserved with sourcepos
        assert!(html.contains("<pre data-sourcepos="));
    }
}
