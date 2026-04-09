// File type icons as inline SVGs for the file tree

const FOLDER_CLOSED = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 2.5h4l1.5 1.5h6.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" fill="#97cfe0" opacity="0.9"/></svg>`;

const FOLDER_OPEN = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 2.5h4l1.5 1.5h6.5a1 1 0 0 1 1 1V6H6.5L5 7.5H1.5V3.5a1 1 0 0 1 1-1z" fill="#97cfe0" opacity="0.7"/><path d="M1 7h4.5l1.5-1.5h7.5l-2 6.5H3z" fill="#97cfe0" opacity="0.9"/></svg>`;

const FILE_MARKDOWN = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#97cfe0" stroke-width="1" fill="none"/><text x="8" y="11" text-anchor="middle" font-size="7" font-weight="bold" font-family="sans-serif" fill="#97cfe0">M</text></svg>`;

const FILE_JSON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#8baab8" stroke-width="1" fill="none"/><text x="8" y="11.5" text-anchor="middle" font-size="8" font-weight="bold" font-family="sans-serif" fill="#8baab8">{ }</text></svg>`;

const FILE_YAML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#a8c7d4" stroke-width="1" fill="none"/><text x="8" y="11" text-anchor="middle" font-size="5.5" font-weight="bold" font-family="sans-serif" fill="#a8c7d4">YML</text></svg>`;

const FILE_TOML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#a8c7d4" stroke-width="1" fill="none"/><text x="8" y="11" text-anchor="middle" font-size="5" font-weight="bold" font-family="sans-serif" fill="#a8c7d4">TML</text></svg>`;

const FILE_JS = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#8baab8"/><text x="8" y="11.5" text-anchor="middle" font-size="7" font-weight="bold" font-family="sans-serif" fill="#0d131e">JS</text></svg>`;

const FILE_TS = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#97cfe0"/><text x="8" y="11.5" text-anchor="middle" font-size="7" font-weight="bold" font-family="sans-serif" fill="#0d131e">TS</text></svg>`;

const FILE_HTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#7eb8cc" stroke-width="1" fill="none"/><text x="8" y="11" text-anchor="middle" font-size="7" font-weight="bold" font-family="sans-serif" fill="#7eb8cc">&lt;/&gt;</text></svg>`;

const FILE_CSS = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#97cfe0" stroke-width="1" fill="none"/><text x="8" y="11" text-anchor="middle" font-size="5.5" font-weight="bold" font-family="sans-serif" fill="#97cfe0">CSS</text></svg>`;

const FILE_IMAGE = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#6e8d9c" stroke-width="1" fill="none"/><circle cx="6" cy="7" r="1.5" fill="#6e8d9c"/><path d="M2.5 12.5l3-3 2 1.5 2.5-3 2.5 3" stroke="#6e8d9c" stroke-width="1" stroke-linejoin="round"/></svg>`;

const FILE_RUST = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z" stroke="#7eb8cc" stroke-width="1.2" fill="none"/><path d="M8 4.5v3M6 9.5h4M6.5 7.5L8 5.5l1.5 2h-3z" stroke="#7eb8cc" stroke-width="1" fill="none"/><circle cx="8" cy="1.5" r="0.7" fill="#7eb8cc"/><circle cx="8" cy="14.5" r="0.7" fill="#7eb8cc"/><circle cx="2.3" cy="5" r="0.7" fill="#7eb8cc"/><circle cx="13.7" cy="5" r="0.7" fill="#7eb8cc"/><circle cx="2.3" cy="11" r="0.7" fill="#7eb8cc"/><circle cx="13.7" cy="11" r="0.7" fill="#7eb8cc"/></svg>`;

const FILE_GENERIC = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" stroke="#7f8c9b" stroke-width="1" fill="none"/><path d="M10 1.5v3h3" stroke="#7f8c9b" stroke-width="1"/></svg>`;

const EXTENSION_MAP: Record<string, string> = {
  '.md': FILE_MARKDOWN,
  '.markdown': FILE_MARKDOWN,
  '.json': FILE_JSON,
  '.yml': FILE_YAML,
  '.yaml': FILE_YAML,
  '.toml': FILE_TOML,
  '.js': FILE_JS,
  '.jsx': FILE_JS,
  '.ts': FILE_TS,
  '.tsx': FILE_TS,
  '.html': FILE_HTML,
  '.css': FILE_CSS,
  '.png': FILE_IMAGE,
  '.jpg': FILE_IMAGE,
  '.jpeg': FILE_IMAGE,
  '.gif': FILE_IMAGE,
  '.svg': FILE_IMAGE,
  '.webp': FILE_IMAGE,
  '.rs': FILE_RUST,
};

export function getFileIcon(fileName: string, isDir: boolean, isExpanded: boolean): string {
  if (isDir) {
    return isExpanded ? FOLDER_OPEN : FOLDER_CLOSED;
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = fileName.slice(dotIndex).toLowerCase();
    const icon = EXTENSION_MAP[ext];
    if (icon) {
      return icon;
    }
  }

  return FILE_GENERIC;
}
