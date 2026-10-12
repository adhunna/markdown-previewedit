# MarkDownPreview

[![CI](https://github.com/adhunna/MarkDownPreview/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/adhunna/MarkDownPreview/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A free, open-source VS Code extension that adds the missing pieces to **VS Code's built-in Markdown preview**: Mermaid diagrams, GitHub alerts, task lists, a table of contents, a Dark/Light switch, zoom and a full-screen view. It also exports your Markdown to **Word, PDF and HTML**.

It works offline, sends no telemetry, and treats every Markdown file as untrusted.

> **Status:** v0.2.0 pre-release. It is not on the Marketplace yet; install it from a `.vsix` file (see [Install](#install)). See the [roadmap](ROADMAP.md) for what's done and what's next.

## Features

### Preview buttons

When a Markdown file is open, click the **Open Preview to the Side** button (top right of the editor). Hold `Alt` while clicking to open the preview in the same tab. `Ctrl+K V` and `Ctrl+Shift+V` work too.

The preview tab then gets these buttons (top right):

| Button | Shortcut (click in the preview first) | What it does |
|---|---|---|
| Zoom out / zoom in | `Ctrl+-` / `Ctrl+=` | Smaller / larger text (8–40 px) |
| — | `Ctrl+0` | Reset the text size |
| Colour mode (half circle) | — | Cycle the preview theme: **Auto** (follow VS Code) → **Light** → **Dark** |
| Full screen (four corners) | — | Fill the VS Code window with the preview: other editors, side bars and the panel are hidden. Click again to restore. |

All of these are also in the Command Palette (`Ctrl+Shift+P`, type **MDP**).

### Extra Markdown

| Feature | Syntax |
|---|---|
| Mermaid diagrams (offline, follow the theme, clear error box if broken) | ```` ```mermaid ```` |
| GitHub alerts | `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` |
| Boxes and collapsible sections | `::: warning Title` … `:::`, `::: details Summary` … `:::` |
| Table of contents | `[TOC]` on its own line |
| Task lists | `- [ ]` / `- [x]` |
| Footnotes, definition lists, abbreviations | `[^1]`, `Term` + `: Definition`, `*[HTML]: …` |
| Highlight, inserted, sub/superscript, emoji | `==mark==`, `++ins++`, `H~2~O`, `x^2^`, `:tada:` |

Everything the built-in preview already does keeps working: math (`$…$`, `$$…$$`), front matter, scroll sync, live update, links, find (`Ctrl+F`).

### Export

Right-click in a Markdown file → **MDP: Export**, or `Ctrl+Shift+P` → "MDP: Export…":

| Command | Result |
|---|---|
| **MDP: Export to Word (.docx)** | A native Word file with real Heading, list, table, quote and code styles. *Images, diagrams and equations are placeholders in this version.* |
| **MDP: Export to PDF** | Printed by the **Microsoft Edge** already on your PC (or Chrome/Chromium); nothing is downloaded. Includes diagrams and math. |
| **MDP: Export to HTML** | One self-contained page that works offline, with diagrams and math. |

Exports always use a light, print-friendly style, whatever the preview theme.

## Install

1. Download `markdownpreview-<version>.vsix`. Pick the latest successful [CI run](https://github.com/adhunna/MarkDownPreview/actions/workflows/ci.yml) and open its **Artifacts** section. Or [build it yourself](#build-from-source).
2. In VS Code, open the **Extensions** view (`Ctrl+Shift+X`), click the **`…`** menu at the top right of the view, choose **Install from VSIX…** and pick the file.
3. Open any `.md` file and click the preview button at the top right.

Requires VS Code 1.95 or newer, on Windows, macOS or Linux. PDF export needs Microsoft Edge, Google Chrome or Chromium.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `mdp.preview.theme` | `auto` | Preview colours: `auto` (follow VS Code), `light`, `dark` |
| `markdown.preview.fontSize` | `14` | VS Code's own preview font size, changed by the zoom buttons |
| `mdp.mermaid.enabled` | `true` | Render Mermaid code blocks as diagrams |
| `mdp.export.openAfterExport` | `true` | Open the exported file (for example in Word) when done |
| `mdp.export.browserPath` | *(auto)* | Browser for PDF export, if Edge/Chrome is not found automatically |
| `mdp.export.pdf.format` | `A4` | Paper size: A4, A3, A5, Letter, Legal |
| `mdp.export.pdf.margin` | `20mm` | Page margin |

## Security and privacy

- Works inside VS Code's preview security (Content-Security-Policy, sanitizer) and never asks you to loosen it.
- Exported HTML is sanitized: scripts, frames, forms, event handlers and `javascript:` links are removed. A set of hostile Markdown files ([`samples/malicious/`](samples/malicious/)) is tested on every build.
- PDF export starts a local browser, so it is disabled in untrusted (Restricted Mode) workspaces.
- Nothing is downloaded at runtime. No telemetry.

Found a vulnerability? Please report it privately. See [SECURITY.md](SECURITY.md).

## Roadmap

[ROADMAP.md](ROADMAP.md) lists what is implemented and every planned feature. That covers 128 researched features, ordered **Next (v1.0)**, **Later** and **Ideas**. Highlights coming next include a Word reference template, copying as rich text for Outlook and Teams, smart paste from Word/Excel, images and diagrams in Word, Graphviz, file imports and custom CSS.

## Contributing

Contributions are welcome: bug reports, ideas, docs and code. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

### Build from source

Requires Node.js 22 LTS.

```powershell
git clone https://github.com/adhunna/MarkDownPreview.git
cd MarkDownPreview
npm ci
npm test            # plugins, exports, security corpus (+ PDF if Edge/Chrome is installed)
npm run package     # → markdownpreview-<version>.vsix
```

Press **F5** in VS Code to run the extension in a development window.

### Project documents

| Document | Contents |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Implemented features and the future list |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version |
| [docs/adr/001-stack-typescript-builtin-preview.md](docs/adr/001-stack-typescript-builtin-preview.md) | Why TypeScript on top of the built-in preview |
| [docs/01-market-research.md](docs/01-market-research.md) | Competitors, trends, gaps, positioning |
| [docs/02-feature-catalog.md](docs/02-feature-catalog.md) | All 128 features with IDs, priorities and status |
| [docs/03-architecture.md](docs/03-architecture.md) | Long-term C#/.NET design (future option) |
| [docs/04-implementation-plan.md](docs/04-implementation-plan.md) | Phases, testing, release, risks, decisions |
| [docs/05-one-week-mvp.md](docs/05-one-week-mvp.md) | The original one-week C# plan (superseded) |
| [AGENTS.md](AGENTS.md) | Project rules and glossary for contributors and AI coding agents |

## License

[MIT](LICENSE) © The MarkDownPreview contributors. The extension bundles open-source packages under their own licences, which are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Inspired by [Markdown Preview Enhanced](https://github.com/shd101wyy/vscode-markdown-preview-enhanced); no code is shared.
