import { invoke } from "@tauri-apps/api/core";
import { getWorkspaceRoot } from "./file-tree";

interface SearchResult {
  file_path: string;
  file_name: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

let searchPanelEl: HTMLElement | null = null;
let onResultClick: ((path: string, line: number) => void) | null = null;

export function initSearchPanel(
  container: HTMLElement,
  resultClickCallback: (path: string, line: number) => void
): void {
  searchPanelEl = container;
  onResultClick = resultClickCallback;

  container.innerHTML = `
    <div id="search-header">
      <h2>Search</h2>
    </div>
    <div id="search-input-wrapper">
      <input type="text" id="search-input" placeholder="Search across files..." />
    </div>
    <div id="search-status"></div>
    <div id="search-results"></div>
  `;

  const input = container.querySelector("#search-input") as HTMLInputElement;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      performSearch(input.value);
    }
  });
}

async function performSearch(query: string): Promise<void> {
  if (!searchPanelEl) return;

  const statusEl = searchPanelEl.querySelector("#search-status") as HTMLElement;
  const resultsEl = searchPanelEl.querySelector("#search-results") as HTMLElement;

  if (!query.trim()) {
    statusEl.textContent = "";
    resultsEl.innerHTML = "";
    return;
  }

  const dir = getWorkspaceRoot();
  if (!dir) {
    statusEl.textContent = "Open a folder to search";
    resultsEl.innerHTML = "";
    return;
  }

  statusEl.textContent = "Searching...";
  resultsEl.innerHTML = "";

  try {
    const results = await invoke<SearchResult[]>("search_in_files", {
      dir,
      query: query.trim(),
    });

    if (results.length === 0) {
      statusEl.textContent = "No results found";
      return;
    }

    statusEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"} found`;
    renderResults(results, resultsEl, query.trim());
  } catch (e) {
    statusEl.textContent = `Search failed: ${e}`;
  }
}

function renderResults(
  results: SearchResult[],
  container: HTMLElement,
  query: string
): void {
  // Group results by file_path
  const grouped = new Map<string, SearchResult[]>();
  for (const r of results) {
    let group = grouped.get(r.file_path);
    if (!group) {
      group = [];
      grouped.set(r.file_path, group);
    }
    group.push(r);
  }

  for (const [filePath, matches] of grouped) {
    const groupEl = document.createElement("div");
    groupEl.className = "search-file-group";

    // File header
    const headerEl = document.createElement("div");
    headerEl.className = "search-file-header";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = matches[0].file_name;
    headerEl.appendChild(nameSpan);

    const countSpan = document.createElement("span");
    countSpan.className = "search-match-count";
    countSpan.textContent = String(matches.length);
    headerEl.appendChild(countSpan);

    groupEl.appendChild(headerEl);

    // Individual matches
    for (const match of matches) {
      const itemEl = document.createElement("div");
      itemEl.className = "search-result-item";

      const lineNumEl = document.createElement("span");
      lineNumEl.className = "search-line-number";
      lineNumEl.textContent = String(match.line_number);
      itemEl.appendChild(lineNumEl);

      const contentEl = document.createElement("span");
      contentEl.className = "search-line-content";

      // Highlight the matched text
      const line = match.line_content;
      const before = line.substring(0, match.match_start);
      const matched = line.substring(match.match_start, match.match_end);
      const after = line.substring(match.match_end);

      contentEl.appendChild(document.createTextNode(before));

      const highlightEl = document.createElement("span");
      highlightEl.className = "search-match-highlight";
      highlightEl.textContent = matched;
      contentEl.appendChild(highlightEl);

      contentEl.appendChild(document.createTextNode(after));

      itemEl.appendChild(contentEl);

      itemEl.addEventListener("click", () => {
        onResultClick?.(filePath, match.line_number);
      });

      groupEl.appendChild(itemEl);
    }

    container.appendChild(groupEl);
  }
}
