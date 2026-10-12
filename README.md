# MarkDownPreview

Adds the missing pieces to **VS Code's built-in Markdown preview** — Mermaid diagrams, GitHub alerts, task lists, a table of contents and more — and exports your Markdown to **Word, PDF and HTML**.

> **Status:** v0.2.0. Install it from the `.vsix` file (not on the Marketplace yet).

## What you get

**In the preview** (`Ctrl+Shift+V`, or `Ctrl+K V` for side-by-side):

| Feature | Syntax |
|---|---|
| Mermaid diagrams (offline, follow your light/dark theme, clear error box) | ```` ```mermaid ```` |
| GitHub alerts | `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` |
| Boxes and collapsibles | `::: warning Title` … `:::`, `::: details Summary` … `:::` |
| Table of contents | `[TOC]` on its own line |
| Task lists | `- [ ]` / `- [x]` |
| Footnotes, definition lists, abbreviations | `[^1]`, `Term` + `: Definition`, `*[HTML]: …` |
| Highlight, inserted, sub/superscript, emoji | `==mark==`, `++ins++`, `H~2~O`, `x^2^`, `:tada:` |

**Font size and theme** — use the buttons in the title bar (top right) of a Markdown file or of its preview, next to VS Code's own *Open Preview to the Side* button:

| Button / shortcut (preview focused) | Action |
|---|---|
| 🔍➖ / `Ctrl+-` | Smaller text |
| 🔍➕ / `Ctrl+=` | Larger text |
| `Ctrl+0` | Reset text size |
| Colour-mode button (half circle) | Cycle theme: **Auto** (follow VS Code) → **Light** → **Dark** |

Everything the built-in preview already does keeps working: math (`$…$`, `$$…$$`), front matter, scroll sync, live update, themes, links.

**Export** — right-click in a Markdown editor → **MDP: Export**, or `Ctrl+Shift+P` → "MDP: Export…":

| Command | Result |
|---|---|
| **MDP: Export to Word (.docx)** | A native Word file with real Heading, list, table, quote and code styles. *Images, diagrams and equations appear as placeholders in this version.* |
| **MDP: Export to PDF** | Printed by the **Microsoft Edge** already on your PC (or Chrome/Chromium) — nothing is downloaded. Includes diagrams and math. |
| **MDP: Export to HTML** | One self-contained page that works offline, with diagrams and math. |

## Install (Windows)

1. Get `markdownpreview-0.2.0.vsix` (from the GitHub Actions **CI** run artifacts, or build it — see below).
2. In VS Code: **Extensions** view (`Ctrl+Shift+X`) → **`…`** menu (top right of the view) → **Install from VSIX…** → pick the file.
3. Open `samples/features/all.md` from this repository and press `Ctrl+K V`.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `mdp.preview.theme` | `auto` | Preview colours: `auto` (follow VS Code), `light`, `dark` |
| `markdown.preview.fontSize` | `14` | VS Code's own preview font size — changed by the zoom buttons |
| `mdp.mermaid.enabled` | `true` | Render Mermaid code blocks as diagrams |
| `mdp.export.openAfterExport` | `true` | Open the exported file (e.g. in Word) when done |
| `mdp.export.browserPath` | *(auto)* | Browser for PDF export, if Edge/Chrome is not found automatically |
| `mdp.export.pdf.format` | `A4` | Paper size: A4, A3, A5, Letter, Legal |
| `mdp.export.pdf.margin` | `20mm` | Page margin |

## Security

- Works with VS Code's preview security (Content-Security-Policy, sanitizing); nothing is loaded from the internet.
- Exported HTML is sanitized: scripts, frames, forms, event handlers and `javascript:` links are removed. A corpus of hostile Markdown files (`samples/malicious/`) is tested on every build.
- PDF export starts a local browser, so it is disabled in untrusted (Restricted Mode) workspaces.
- No telemetry.

## Build from source

Requires Node.js 22 LTS.

```powershell
npm ci
npm test            # plugins, exports, security corpus (+ PDF if Edge/Chrome is installed)
npm run package     # → markdownpreview-0.2.0.vsix
```

Press **F5** in VS Code to run the extension in a development window.

## Project documents

| Document | Contents |
|---|---|
| [docs/adr/001-stack-typescript-builtin-preview.md](docs/adr/001-stack-typescript-builtin-preview.md) | Why TypeScript on the built-in preview (current stack) |
| [docs/01-market-research.md](docs/01-market-research.md) | Competitors, 2026 trends, gaps, positioning |
| [docs/02-feature-catalog.md](docs/02-feature-catalog.md) | 128 features with IDs, priorities and status |
| [docs/03-architecture.md](docs/03-architecture.md) | Long-term C#/.NET design (future option) |
| [docs/04-implementation-plan.md](docs/04-implementation-plan.md) | Roadmap phases, testing, release, risks, open decisions |
| [docs/05-one-week-mvp.md](docs/05-one-week-mvp.md) | The original one-week C# fast-track plan (superseded) |
| [AGENTS.md](AGENTS.md) | Glossary and rules for AI coding agents (and humans) |
