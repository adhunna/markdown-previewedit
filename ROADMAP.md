# Roadmap

What Markdown PreviewEdit can do today, and everything planned for later. Every item has a **Feature ID** from the [feature catalog](docs/02-feature-catalog.md), which has the full descriptions and the original market research behind them ([docs/01-market-research.md](docs/01-market-research.md)).

**Where we are:** [v0.3.0](https://github.com/adhunna/markdown-previewedit/releases), the first public pre-release (installed from a `.vsix` file). Of the 130 catalogued features (128 from the original research plus 2 requested since), **23 are done**, **10 are partly done**, **16 come free with VS Code's built-in preview** (we extend it rather than replace it), and **1 is no longer needed** with the TypeScript stack. The other **80**, plus the unfinished parts of the partial items, are in the [future list](#future-list) below.

★ = a differentiator: something Markdown Preview Enhanced and similar extensions do not offer.

Want to help? Pick an item, comment on (or open) an issue that names its ID, and see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Implemented

### Added by Markdown PreviewEdit

| ID | Feature | Since |
|---|---|---|
| A01 | **Open Preview to the Side** button on every Markdown file (`Alt`+click opens it in the same tab) | 0.2.0 |
| A10 | Preview theme: **Auto / Light / Dark**, independent of the VS Code theme *(partial; see future list)* | 0.2.0 |
| A12 | Preview **font size**: zoom buttons, `Ctrl+=` / `Ctrl+-` / `Ctrl+0` *(partial)* | 0.2.0 |
| A23 | **Full-screen preview** inside the VS Code window *(partial)* | 0.2.0 |
| A24 | **Format from preview** ★: select text in the Edit Preview and use the toolbar (headings, bold/italic/…, lists, quote, alerts, case, colour, size); written into the `.md` file *(partial: text)* | 0.3.0 |
| B02 | Task lists rendered as checkboxes (rest of GitHub Flavored Markdown is built in) | 0.1.0 |
| B03 | GitHub alerts: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` | 0.1.0 |
| B10 | Footnotes, definition lists, abbreviations | 0.1.0 |
| B11 | Subscript, superscript, `==highlight==`, `++inserted++` | 0.1.0 |
| B12 | Emoji shortcodes such as `:tada:` | 0.1.0 |
| B13 | Boxes and collapsible sections: `::: warning`, `::: details` | 0.1.0 |
| B14 | `[TOC]` / `<!-- toc -->` table of contents | 0.1.0 |
| C01 | **Mermaid diagrams**, bundled (offline), follow the light/dark theme | 0.1.0 |
| C02 | A clear error box for a broken diagram instead of a blank area | 0.1.0 |
| C03 | Diagrams are not redrawn when unrelated text changes | 0.1.0 |
| E01 | **Export to HTML**: one self-contained, offline page with math and diagrams (keeps safe text colour and size) | 0.1.0 |
| E02 | **Export to PDF** with the Edge/Chrome already installed (no browser download) ★ | 0.1.0 |
| E03 | PDF paper size and margins *(partial)* | 0.1.0 |
| E04 | **Export to Word (.docx)**, native with real Word styles, no Pandoc ★ *(partial: "DOCX-lite")* | 0.1.0 |
| J02 | Sanitized HTML: VS Code's sanitizer in the preview, an allowlist sanitizer in exports | 0.1.0 |
| J03 | Workspace Trust: PDF export is off in Restricted Mode *(partial)* | 0.1.0 |
| J05 | No `eval` or dynamic code anywhere; Mermaid runs in strict mode | 0.1.0 |
| J04 | Every message from the Edit Preview is allowlisted and validated | 0.3.0 |
| J06 | The PDF browser is started without a shell | 0.1.0 |
| J07 | **Offline by default**: everything bundled, no CDN | 0.1.0 |
| J09 | No telemetry | 0.1.0 |
| J10 | Supply chain: lockfile, third-party licence notices, security policy *(partial)* | 0.2.0 |
| J11 | Hostile-Markdown test corpus run on every build | 0.1.0 |
| K01, K02, K08 | One universal `.vsix` for Windows, macOS and Linux (no native code) | 0.1.0 |
| M01 | Small settings set: 6 settings (MPE has 74) | 0.1.0 |
| N02 | "Markdown PreviewEdit" log in the Output panel *(partial)* | 0.1.0 |
| N04 | Errors are isolated per diagram *(partial)* | 0.1.0 |

### Provided by VS Code's built-in preview (kept working)

| ID | Feature |
|---|---|
| A02 | Locked preview (stays on one file) |
| A04 | Live update while typing |
| A06, A07 | Scroll sync in both directions; double-click the preview to jump to the source |
| A09 | Follows the VS Code colour theme, including high contrast |
| A14 | Find in preview (`Ctrl+F`) |
| A15 | Relative images and links; `Ctrl+click` to follow links |
| A17 | Previews are restored after a restart |
| B01, B04, B05, B06 | CommonMark, front matter, heading anchors, safe raw HTML |
| B07 | Math with KaTeX (`$…$`, `$$…$$`) |
| B08 | Code highlighting |
| J01 | Strict Content-Security-Policy in the preview |

### Not needed any more

| ID | Feature | Why |
|---|---|---|
| N01 | Supervisor for a separate rendering engine | There is no separate engine ([ADR-001](docs/adr/001-stack-typescript-builtin-preview.md)) |

---

## Future list

Ordered by priority. **Next** = wanted for v1.0, **Later** = v1.x, **Ideas** = only if users ask. Items marked *(rest)* finish a partly done feature.

### Next — v1.0

| ID | Area | Feature |
|---|---|---|
| A03 | Preview | Single-preview vs multiple-preview mode |
| A05 | Preview | Incremental updates: only changed blocks are replaced, so scroll position, diagrams and images stay stable |
| A08 | Preview | Highlight the block under the editor cursor in the preview |
| A10 *(rest)* | Preview | Preview styles: GitHub Light/Dark, **"Word document" look** ★, Academic/print |
| A11 | Preview | Custom CSS: user, workspace (`.mdp/style.css`) and front matter `css:` |
| A12 *(rest)* | Preview | `Ctrl`+mouse-wheel zoom |
| A13 | Preview | Outline (TOC) side panel in the preview: collapsible, highlights the current section |
| A19 | Preview | Large-document mode: render budget, progressive rendering, pause live update above a size |
| A21 | Preview | Right-click menu in the preview (export, copy, open in browser, toggles) |
| A24 *(rest)* | Preview | Format more from the Edit Preview: table rows/columns, image size, code-block language |
| C12 | Diagrams | **Style diagrams from the preview**: click a Mermaid node to change its colours or label ★ (phase 2 of A24) |
| B09 | Syntax | Code-block extras: line numbers, highlighted lines `{highlight=2-4}`, title, copy button, diff colours |
| B15 | Syntax | Line-break mode (single newline → line break) toggle |
| B22 | Syntax | Page-break marker `<!-- pagebreak -->` for PDF and Word |
| C04 | Diagrams | Graphviz / DOT, bundled (no install) |
| D01 | Imports | `@import "file.md"`: include other Markdown files |
| D02 | Imports | Include source files as code blocks with line ranges |
| D03 | Imports | Include CSV/TSV as a table |
| D06 | Imports | Cycle and depth limits; no imports from outside the workspace in Restricted Mode |
| D07 | Imports | Refresh the preview when an imported file changes |
| E03 *(rest)* | Export | PDF orientation, header/footer (title, page X of Y, date), backgrounds, CSS `@page` |
| E04 *(rest)* | Export | Word: images (SVG + PNG), bookmarks/internal links, highlighted code, page breaks ★ |
| E05 | Export | Word **reference template**: use the styles of your company `.dotx`/`.docx` ★ |
| E08 | Export | Diagrams and math as images in Word and PDF |
| E09 | Export | **Copy as rich text** for pasting into Outlook, Teams, Word and OneNote ★ |
| F01 | Office | **Smart paste**: paste from Word, Outlook, OneNote, Teams or a browser as clean Markdown ★ |
| F02 | Office | **Paste an Excel/CSV range as a Markdown table** ★ |
| J03 *(rest)* | Security | Restricted Mode also covers imports, external tools and code chunks as they arrive |
| J08 | Security | Remote-content security levels (Strict / Default / Off) |
| J10 *(rest)* | Security | Dependency and licence scanning in CI, SBOM, signed releases |
| K03 | Platform | Verify Remote-SSH, WSL, Dev Containers and Codespaces |
| K04 | Platform | Publish to the VS Code Marketplace **and** Open VSX (Cursor, Windsurf, VSCodium) |
| K05 | Platform | Pre-release channel |
| K06 | Platform | Accessibility: keyboard navigation, screen readers, MathML, high contrast |
| M02 | Settings | Per-document options in front matter |
| N02 *(rest)* | Reliability | Render timings in the log |
| N03 | Reliability | "Report an issue" command (versions + redacted settings) |
| N04 *(rest)* | Reliability | Clear error message for any failed block, never a blank page |

### Later — v1.x

| ID | Area | Feature |
|---|---|---|
| A16 | Preview | Click an image to enlarge it |
| A18 | Preview | Status bar: word count, reading time, characters |
| A20 | Preview | Preview untitled files, Git diffs and remote/virtual files |
| A22 | Preview | Open the rendered page in your web browser |
| B16 | Syntax | Grid tables and merged cells |
| B17 | Syntax | Smart typography (curly quotes, dashes, ellipses) |
| B18 | Syntax | Audio/video; YouTube/Vimeo embeds (privacy mode, opt-in) |
| B19 | Syntax | Wiki links `[[Note]]`, `[[Note#Heading]]`, `![[embed]]` |
| B20 | Syntax | Figures with captions; image sizes `{width=50%}` |
| B21 | Syntax | CJK-friendly emphasis |
| C05 | Diagrams | Copy a diagram as SVG/PNG or save it, ready for Word/PowerPoint ★ |
| C06 | Diagrams | PlantUML (local Java or your own server) |
| C07 | Diagrams | Kroki (opt-in, with a "content leaves your machine" notice) |
| C08 | Diagrams | Vega / Vega-Lite charts |
| C09 | Diagrams | Pan and zoom for large diagrams |
| D04 | Imports | **Include an Excel range as a table** ★ |
| D05 | Imports | Include one section or block of another note |
| E06 | Export | Word extras: TOC field, document properties from front matter, headers/footers, cover page |
| E07 | Export | Math as **editable Word equations** ★ |
| E10 | Export | Export presets in front matter or workspace settings |
| E11 | Export | Batch export of a folder, with progress and cancel |
| E12 | Export | PNG/JPEG snapshot of the document or a selection |
| E13 | Export | Clean GitHub Markdown export (imports resolved, diagrams as images) |
| E14 | Export | Export on save |
| F03 | Office | Convert `.docx` → `.md` (headings, images, tables, footnotes) ★ |
| F04 | Office | Convert `.html` → `.md` |
| I01 | Authoring | Insert / update TOC command |
| I02 | Authoring | Insert table command (rows × columns) |
| I03 | Authoring | Insert page break command |
| I04 | Authoring | Snippets: alerts, Mermaid, math, `details` |
| K07 | Platform | Translations of the user interface |
| L01 | AI | Tools for VS Code agent mode: "export this file to Word/PDF", "render this diagram" ★ |
| M03 | Settings | Workspace config file `.mdp/config.json` (declarative, never code) ★ |
| M04 | Settings | IntelliSense (JSON schemas) for front matter and config |

### Ideas — only if users ask

| ID | Area | Feature |
|---|---|---|
| A23 *(rest)* | Preview | Reading mode with a centred text column |
| B23 | Syntax | CriticMarkup exported as **real Word tracked changes** ★ |
| B24 | Syntax | `#tags` and `^block-id` references |
| C10 | Diagrams | Charts from tables/CSV |
| C11 | Diagrams | WaveDrom, D2, draw.io embeds |
| E15 | Export | **PowerPoint (.pptx) export** from slide-separated Markdown ★ |
| E16 | Export | Pandoc bridge (if installed) for EPUB, ODT, RTF, LaTeX |
| F05 | Office | Convert an Excel sheet to a Markdown table file |
| G01–G03 | Code | Run code blocks (PowerShell, Python, Node, Bash, C#): off by default, trusted workspaces only, with consent and timeouts |
| H01 | Notes | Wiki-link completion, hover preview, go to file |
| H02 | Notes | Backlinks panel |
| H03 | Notes | Graph view |
| K09 | Platform | VS Code for the Web (vscode.dev / github.dev) ★ |
| L02 | AI | MCP server so external agents can render and export ★ |
| L03 | AI | Nicer rendering of `AGENTS.md`, `SKILL.md`, prompt files and other agent instruction files |
| M05 | Settings | Public API for other extensions to add CSS or renderers |

### Not planned

WYSIWYG editing, linting, list/table editing shortcuts, image upload, and executable configuration files. Good tools already exist for the first three, and the last two are privacy and security risks. See *Non-goals* in the [feature catalog](docs/02-feature-catalog.md#non-goals-for-v1-deliberately-not-building).
