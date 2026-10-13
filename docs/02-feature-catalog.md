# 02 — Feature Catalog

> **Purpose:** The single, numbered list of everything the extension may do. Every piece of work references a **Feature ID** from this file (e.g. `E04`).
> **Status:** v0.3.0 (see [ROADMAP.md](../ROADMAP.md) for the implemented / future summary and [ADR-001](adr/001-stack-typescript-builtin-preview.md) for the stack). *Built-in ✅* = provided by VS Code's own Markdown preview, which this extension extends. *Done* / *Partial* = implemented here. *N/A* = not needed with the TypeScript stack. Agents update the *Status* column as work lands — see [AGENTS.md](../AGENTS.md).

## Legend

| Priority | Meaning | Ships in |
|---|---|---|
| **P0** | MVP — the extension is useless without it | Phase 1 (internal alpha) |
| **P1** | Required for v1.0 GA | Phase 2 (public pre-release) or Phase 3 (v1.0) |
| **P2** | Valuable; v1.x | Phase 4 |
| **P3** | Later / only if users ask | Phase 5 |

**Owner** — where the code would live in the original C# design: **E** = engine, **S** = shell (VS Code API), **W** = webview, **R** = render host. Under ADR-001 (TypeScript), *E* items live in `src/markdown/` or `src/export/`, *W* items in the preview script.
**★** = differentiator versus Markdown Preview Enhanced and other competitors.

---

## A. Preview experience

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| A01 | Open preview in current tab / to the side; editor-title button; keybindings (`Ctrl+K V`, `Ctrl+Shift+V` — configurable) | P0 | 1 | S | Built-in ✅ + PreviewEdit title-bar button (v0.2.0) |
| A02 | Locked preview (stays on one file) and toggle lock | P1 | 2 | S | Built-in ✅ |
| A03 | Single-preview vs multiple-preview mode | P1 | 2 | S | Planned |
| A04 | Live update while typing, debounced; stale renders cancelled | P0 | 1 | S+E | Built-in ✅ |
| A05 | Incremental DOM update — only changed blocks are replaced, so scroll position, diagrams and images stay stable | P0 | 1 | E+W | Planned |
| A06 | Editor → preview scroll sync (source-line map) | P0 | 1 | E+W | Built-in ✅ |
| A07 | Preview → editor scroll sync; click / double-click in preview jumps to the source line | P1 | 2 | W+S | Built-in ✅ |
| A08 | Highlight the block under the editor cursor in the preview | P1 | 2 | W | Planned |
| A09 | Preview follows the VS Code theme (light / dark / high-contrast) via `--vscode-*` CSS variables | P0 | 1 | W | Built-in ✅ |
| A10 | Built-in preview themes: GitHub Light/Dark, **"Word document" look** ★, Academic/print | P1 | 2 | W | Partial (v0.2.0: Auto/Light/Dark) |
| A11 | Custom CSS: user-level, workspace-level (`.mdp/style.css`), front-matter `css:` | P1 | 2 | S+E | Planned |
| A12 | Font family / size / line height; zoom in/out/reset (`Ctrl +/-/0`, `Ctrl`+wheel) | P1 | 2 | W | Partial (v0.2.0: font size; built-in font/line height) |
| A13 | Outline (TOC) sidebar inside the preview: collapsible, resizable, highlights current section | P1 | 2 | E+W | Planned |
| A14 | Find in preview (`Ctrl+F`) | P1 | 2 | S | Built-in ✅ |
| A15 | Relative images/links resolved safely; `Ctrl+click` opens `.md` links in the editor, web links in the browser (other schemes need confirmation) | P0 | 1 | S+E | Built-in ✅ |
| A16 | Image lightbox (click to enlarge) | P2 | 4 | W | Planned |
| A17 | Previews restored after VS Code restart | P1 | 2 | S | Built-in ✅ |
| A18 | Status bar: word count, reading time, characters | P2 | 4 | S+E | Planned |
| A19 | Large-document mode: render budget, progressive rendering, auto-pause live update above a size threshold | P1 | 2 | E+W | Planned |
| A20 | Preview non-file sources: untitled documents, Git diff views, remote/virtual file systems | P2 | 4 | S | Planned |
| A21 | Right-click context menu in preview (export, copy, open in browser, toggles) | P1 | 2 | W+S | Planned |
| A22 | Open rendered HTML in the external browser | P2 | 4 | S+E | Planned |
| A23 | Zen / reading mode (centered column, no chrome) | P3 | 5 | W | Partial (v0.2.0: full-screen preview button) |
| A24 | **Format from preview** ★: select text in an *Edit Preview* and apply headings, bold/italic/…, lists, quotes, alerts, case, colour and size from a toolbar; written into the `.md` file (format only, no typing — see ADR-002) | P1 | 2 | S+W+E | Partial (v0.3.0: text formatting) |

## B. Markdown syntax (engine: Markdig + custom extensions)

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| B01 | CommonMark 0.31.2 compliance | P0 | 1 | E | Built-in ✅ |
| B02 | GitHub Flavored Markdown: tables, task lists, strikethrough, autolinks | P0 | 1 | E | Done (v0.1.0) |
| B03 | GitHub alerts `> [!NOTE]` / TIP / IMPORTANT / WARNING / CAUTION and Obsidian-style callouts (incl. collapsible `[!info]-`) | P0 | 1 | E | Done (v0.1.0) |
| B04 | YAML front matter: hide / show as table / show as code; supplies title and per-document options | P0 | 1 | E | Built-in ✅ |
| B05 | Heading IDs with GitHub-compatible slugs (de-duplicated), `{#custom-id}` and `{.class}` attributes | P0 | 1 | E | Built-in ✅ |
| B06 | Raw HTML via a sanitizing allowlist (`details/summary`, `kbd`, `sup/sub`, sized `img`, …) | P0 | 1 | E | Built-in ✅ |
| B07 | Math: `$…$`, `$$…$$`, `\(…\)`, `\[…\]`, ```` ```math ````; KaTeX default, MathJax 4 option | P0 | 1 | E+W | Built-in ✅ |
| B08 | Code-block syntax highlighting that matches the active VS Code theme (TextMate grammars via Shiki), languages lazy-loaded | P0 | 1 | W | Built-in ✅ |
| B09 | Code-block extras: line numbers, line highlights `{highlight=2-4}`, title/filename, copy button, diff colouring | P1 | 2 | E+W | Planned |
| B10 | Footnotes, definition lists, abbreviations | P1 | 2 | E | Done (v0.1.0) |
| B11 | Subscript, superscript, `==mark==`, `++inserted++` | P1 | 2 | E | Done (v0.1.0) |
| B12 | Emoji shortcodes `:tada:` | P1 | 2 | E | Done (v0.1.0) |
| B13 | Custom containers / admonitions `::: warning` | P1 | 2 | E | Done (v0.1.0) |
| B14 | `[TOC]` / `<!-- toc -->` placeholder rendered as a table of contents (depth configurable) | P1 | 2 | E | Done (v0.1.0) |
| B15 | Line-break mode (single newline → `<br>`) toggle | P1 | 2 | E | Planned |
| B16 | Grid tables & extended tables (colspan/rowspan, multi-line cells) | P2 | 4 | E | Planned |
| B17 | Smart typography (curly quotes, dashes, ellipses) | P2 | 4 | E | Planned |
| B18 | Media: local audio/video; YouTube/Vimeo embeds (privacy-enhanced, opt-in) | P2 | 4 | E | Planned |
| B19 | Wiki links `[[Note]]`, `[[Note#Heading]]`, `[[Note\|Alias]]`, `![[embed]]` | P2 | 4 | E | Planned |
| B20 | Figures & captions; image size attributes `{width=50%}` | P2 | 4 | E | Planned |
| B21 | CJK-friendly emphasis | P2 | 4 | E | Planned |
| B22 | Page-break marker `<!-- pagebreak -->` honoured by PDF and DOCX export | P1 | 3 | E | Planned |
| B23 | CriticMarkup — exported to DOCX as **real Word tracked changes** ★ | P3 | 5 | E | Planned |
| B24 | `#tags` and `^block-id` references | P3 | 5 | E | Planned |

## C. Diagrams & visual blocks

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| C01 | Mermaid — bundled (offline), theme-aware, all diagram types | P0 | 1 | W | Done (v0.1.0) |
| C02 | Inline error box for broken diagrams (never a blank area) + per-diagram render timeout | P0 | 1 | W | Done (v0.1.0) |
| C03 | Diagram cache keyed by content hash (no re-render on unrelated edits) | P1 | 2 | E+W | Done (v0.1.0) |
| C04 | Graphviz / DOT via bundled WebAssembly (no install) | P1 | 2 | W | Planned |
| C05 | Copy diagram as SVG/PNG, save diagram as file — paste straight into Word/PowerPoint ★ | P2 | 4 | W+S | Planned |
| C06 | PlantUML via local `plantuml.jar` (Java) or user-configured server | P2 | 4 | E | Planned |
| C07 | Kroki (opt-in, with a clear "content leaves your machine" notice) | P2 | 4 | E | Planned |
| C08 | Vega / Vega-Lite charts (CSP-safe interpreter mode, no `eval`) | P2 | 4 | W | Planned |
| C09 | Pan / zoom for large diagrams | P2 | 4 | W | Planned |
| C10 | Charts from tables/CSV (```` ```chart ````) | P3 | 5 | W | Planned |
| C11 | WaveDrom (JSON only), D2 (CLI if installed), draw.io `.drawio.svg` embeds | P3 | 5 | E+W | Planned |
| C12 | **Style diagrams from preview** ★: click a Mermaid node in the Edit Preview to change its fill, border and text colour or its label (writes `style`/`classDef` lines) — phase 2 of A24 | P1 | 2 | W+E | Planned |

## D. Composition (imports)

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| D01 | `@import "file.md"` (and `![[file]]` when B19 lands) — include Markdown files | P1 | 2 | E | Planned |
| D02 | Include source-code files as fenced blocks with line ranges `@import "Program.cs" {lines=10-30}` | P1 | 2 | E | Planned |
| D03 | Include CSV/TSV as a table | P1 | 2 | E | Planned |
| D04 | Include an **Excel range** as a table `@import "budget.xlsx" {sheet=Q3 range=A1:F20}` ★ | P2 | 4 | E | Planned |
| D05 | Include a heading section or block of another note (`#heading`, `^block`) | P2 | 4 | E | Planned |
| D06 | Cycle detection, depth limit, workspace-boundary check (outside-workspace imports blocked in Restricted Mode) | P1 | 2 | E | Planned |
| D07 | Preview refreshes when an imported file changes | P1 | 2 | S+E | Planned |

## E. Export

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| E01 | HTML export — single self-contained file (inline CSS, optional embedded images, math/diagrams pre-rendered to SVG, works offline) | P1 | 2 | E+R | Done (v0.1.0) |
| E02 | PDF export using the **browser already installed** (Edge on Windows; Chrome/Chromium/Edge elsewhere) — no bundled Chromium ★ | P1 | 3 | E+R | Done (v0.1.0) |
| E03 | PDF options: page size, margins, orientation, header/footer templates (title, page X of Y, date), print backgrounds, CSS `@page` | P1 | 3 | E | Partial (v0.1.0: paper size, margins) |
| E04 | **Native DOCX export** (no Pandoc) via Open XML SDK: Word built-in styles, lists, tables, hyperlinks, bookmarks, footnotes, images (SVG + PNG fallback), highlighted code, page breaks ★ | P1 | 3 | E | Partial (v0.1.0: DOCX-lite) |
| E05 | DOCX **reference template** — apply styles from the user's corporate `.dotx`/`.docx` ★ | P1 | 3 | E | Planned |
| E06 | DOCX extras: Word TOC field, document properties from front matter (title, author, subject, keywords), headers/footers, cover page | P2 | 4 | E | Planned |
| E07 | Math → **native, editable Word equations (OMML)** ★; fallback to equation images | P2 | 4 | E+R | Planned |
| E08 | Diagrams rendered to images for DOCX/PDF/HTML | P1 | 3 | R+E | Planned |
| E09 | **Copy as rich text** (HTML + plain text) for pasting into Outlook, Teams, Word, OneNote ★ | P1 | 3 | S+E+R | Planned |
| E10 | Export presets in front matter / workspace config (e.g. DOCX template, PDF margins) | P2 | 4 | E | Planned |
| E11 | Batch export (folder/glob) with progress and cancel | P2 | 4 | E+S | Planned |
| E12 | PNG/JPEG snapshot of the document or a selection | P2 | 4 | R | Planned |
| E13 | Clean GFM export (imports resolved, diagrams to images) for GitHub/wiki publishing | P2 | 4 | E | Planned |
| E14 | "Export on save" option | P2 | 4 | S | Planned |
| E15 | **PPTX export** from slide-separated Markdown (`---`) ★ | P3 | 5 | E | Planned |
| E16 | Pandoc bridge (only if installed) for EPUB/ODT/RTF/LaTeX | P3 | 5 | E | Planned |

## F. Import & Office interop ★

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| F01 | **Smart paste**: HTML clipboard from Word/Outlook/OneNote/Teams/browsers → clean Markdown, offered as a "Paste as Markdown" option in VS Code's paste widget ★ | P1 | 3 | S+E | Planned |
| F02 | **Paste Excel/CSV range → Markdown table** with alignment detection ★ | P1 | 3 | S+E | Planned |
| F03 | Convert `.docx` → `.md` (styles → headings, images extracted to a folder, tables, footnotes) ★ | P2 | 4 | E | Planned |
| F04 | Convert `.html` file → `.md` | P2 | 4 | E | Planned |
| F05 | Convert an Excel sheet → Markdown table file | P3 | 5 | E | Planned |

> Image paste/drop from the clipboard is **already built into VS Code** (`markdown.editor.filePaste.*`) — we do not duplicate it.

## G. Code chunks (opt-in, trusted workspaces only)

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| G01 | Run fenced blocks marked `{run}`: PowerShell, Python, Node, Bash, C# (`dotnet run file.cs`, .NET 10 file-based apps) | P3 | 5 | E+S | Planned |
| G02 | Outputs rendered as text / Markdown / sanitized HTML / image | P3 | 5 | E | Planned |
| G03 | Guard rails: off by default, never in Restricted Mode, per-document consent, timeout, kill button | P3 | 5 | S+E | Planned |

## H. Notes / knowledge base (optional)

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| H01 | Wiki-link completion, hover preview, go-to-file | P3 | 5 | S+E | Planned |
| H02 | Backlinks panel | P3 | 5 | S+E | Planned |
| H03 | Graph view | P3 | 5 | W | Planned |

## I. Authoring helpers (light — avoid duplicating built-ins and Markdown All in One)

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| I01 | Command: Insert / update TOC | P2 | 4 | E+S | Planned |
| I02 | Command: Insert table (rows × columns picker) | P2 | 4 | S | Planned |
| I03 | Command: Insert page break | P2 | 4 | S | Planned |
| I04 | Snippets: alerts, Mermaid, math, `details` | P2 | 4 | S | Planned |

## J. Security & privacy ★ (non-negotiable)

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| J01 | Strict webview Content-Security-Policy with per-load nonce; no inline scripts; `localResourceRoots` limited to extension + workspace + document folder | P0 | 1 | S+W | Built-in ✅ |
| J02 | HTML sanitization in the engine (allowlist) **and** DOMPurify in the webview (defense in depth) | P0 | 1 | E+W | Done (v0.1.0: VS Code sanitizer in preview, sanitize-html in exports) |
| J03 | Workspace Trust — Restricted Mode disables: raw-HTML scripts, custom `<head>`, external tools (Java/Pandoc/D2), code chunks, imports outside the workspace | P0 | 1 | S+E | Partial (v0.1.0: PDF export off in Restricted Mode) |
| J04 | Typed, allowlisted webview ↔ shell messages; every payload validated; paths/URIs checked against the source document | P0 | 1 | S+W | Done (v0.3.0: Edit Preview messages, `src/edit/messages.ts`) |
| J05 | No `eval` / `new Function` / dynamic code anywhere (diagram libraries configured in CSP-safe modes) | P0 | 1 | S+W+E | Done (v0.1.0) |
| J06 | External processes started **without a shell**, arguments as arrays, validated paths, timeouts | P0 | 1 | E | Done (v0.1.0) |
| J07 | **Offline by default** — all libraries bundled, zero CDN; network features opt-in and clearly labelled | P0 | 1 | all | Done (v0.1.0) |
| J08 | Remote-content security levels (Strict / Default / Off), similar to the built-in preview | P1 | 2 | S+W | Planned |
| J09 | No telemetry by default; any future telemetry is opt-in and respects `telemetry.telemetryLevel` | P0 | 1 | S | Done (v0.1.0) |
| J10 | Supply chain: lockfiles, dependency + licence scanning, SBOM, signed native binaries, `SECURITY.md` disclosure policy | P1 | 3 | all | Partial (v0.2.0: lockfile, licence notices, SECURITY.md) |
| J11 | **Malicious-Markdown regression corpus** in CI (XSS, path traversal, command injection, ReDoS, huge files) | P0 | 1 | E+W | Done (v0.1.0) |

## K. Platform, distribution, accessibility

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| K01 | Windows x64 | P0 | 1 | all | Done (v0.1.0) |
| K02 | Windows arm64, macOS x64/arm64, Linux x64/arm64/armhf, Alpine x64/arm64 | P1 | 3 | E | Done (v0.1.0: one universal VSIX, no native code) |
| K03 | Remote-SSH, WSL, Dev Containers, Codespaces (engine runs on the workspace side) | P1 | 3 | S+E | Planned (untested in remote setups) |
| K04 | Published to VS Code Marketplace **and** Open VSX (Cursor, Windsurf, VSCodium …) | P1 | 2 | — | Planned |
| K05 | Pre-release channel | P1 | 2 | — | Planned |
| K06 | Accessibility: keyboard navigation, screen-reader-friendly HTML, MathML for math, high-contrast themes | P1 | 2 | W | Planned |
| K07 | Localization (`vscode.l10n`, `package.nls.*.json`) | P2 | 4 | S | Planned |
| K08 | Universal fallback VSIX for other platforms (gets .NET via the .NET Install Tool) | P2 | 4 | S | Done (v0.1.0: universal TypeScript VSIX, no .NET needed) |
| K09 | **VS Code for the Web** (vscode.dev / github.dev) via a .NET WebAssembly engine build ★ | P3 | 5 | E | Planned |

## L. AI-era integration (opt-in)

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| L01 | **Language Model Tools** for VS Code agent mode: "export this file to DOCX/PDF", "render this diagram", "convert this HTML to Markdown" ★ | P2 | 4 | S+E | Planned |
| L02 | **MCP server mode** of the engine so external agents (Claude Code, Copilot CLI, …) can render/export ★ | P3 | 5 | E | Planned |
| L03 | Agent-file awareness: nicer rendering of `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, prompt files (front matter) | P3 | 5 | E | Planned |

## M. Configuration

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| M01 | Small, well-defaulted settings set (target **≤ 30 settings** at v1.0; MPE has 74) | P0 | 1 | S | Done (v0.1.0) |
| M02 | Per-document overrides in front matter | P1 | 2 | E | Planned |
| M03 | Workspace config `.mdp/config.json` — declarative JSON with a schema, **never executable code** ★ | P2 | 4 | E | Planned |
| M04 | JSON Schemas for front matter and config (IntelliSense) | P2 | 4 | S | Planned |
| M05 | Public extension API so other extensions can contribute CSS / renderers | P3 | 5 | S | Planned |

## N. Reliability & diagnostics

| ID | Feature | Pri | Phase | Owner | Status |
|---|---|---|---|---|---|
| N01 | Engine supervisor: lazy start, health check, auto-restart with back-off, graceful shutdown | P0 | 1 | S | N/A (no separate engine; ADR-001) |
| N02 | Log output channel with levels; render timings | P0 | 1 | S+E | Partial (v0.1.0: log channel; no render timings) |
| N03 | "Report an issue" command (versions + redacted settings) | P1 | 2 | S | Planned |
| N04 | Error UI in the preview — clear message, failures isolated per block (never a blank page) | P0 | 1 | E+W | Partial (v0.1.0: per-diagram error boxes) |

---

## Non-goals for v1 (deliberately **not** building)

| Not building | Why | Use instead |
|---|---|---|
| WYSIWYG editor (typing in the preview) | VS Code now ships a built-in rich Markdown editor; market is crowded. *Formatting* selected text from the preview is in scope (A24); typing text there is not. | Built-in "Markdown Editor" |
| Linting | Solved well | markdownlint |
| List editing, shortcuts, table formatter | Solved well | Markdown All in One |
| Image paste/drop, link validation, header rename | Built into VS Code | Built-in Markdown features |
| Executable JS config/parser hooks (MPE's `config.js`/`parser.js`) | Root cause of MPE's RCE issues | Declarative JSON config (M03) |
| Image upload to third-party hosts | Privacy risk, low value | — |

## Totals

130 features — **30 P0**, **47 P1**, **35 P2**, **18 P3**; 19 marked ★ as differentiators. (A24 and C12 were added in v0.3.0 at the owner's request.)
