# Changelog

All notable changes to MarkDownPreview. Feature IDs refer to the [feature catalog](docs/02-feature-catalog.md); see the [roadmap](ROADMAP.md) for what's next.

## 0.3.0 — in development

- **Format from preview (A24):** new **Edit Preview** (pencil button on Markdown files, "MDP: Open Edit Preview"). Select text and use the toolbar: text style and headings, bold, italic, strikethrough, underline, highlight, code, sub/superscript, link, bulleted/numbered/task list, quote, alert type, UPPER/lower/Title/Sentence case, text colour, fill, size and clear formatting. Changes are written into the `.md` file as normal, undoable edits. See [ADR-002](docs/adr/002-edit-preview-webview.md).
- **Colours in exports:** `<span style>` with text colour, background colour or font size is kept in HTML and PDF exports and becomes coloured, shaded or resized text in Word. Any other CSS is removed. Inline `<span style>` was previously shown as literal text.
- **Word export:** inline HTML tags are no longer printed as text; HTML blocks keep their visible text.
- **Security (J04):** the Edit Preview's messages are allowlisted and validated; new hostile sample `samples/malicious/css-injection.md`.

## 0.2.0 — pre-release

- **Full-screen preview (A23):** a full-screen button on the preview's title bar (and "MDP: Toggle Full-Screen Preview") fills the VS Code window with the preview, hiding the other editors, the side bars and the panel; click again to restore.
- **Preview button (A01):** an *Open Preview to the Side* button in the title bar of every Markdown file (hold `Alt` to open the preview in the same tab), so you don't need `Ctrl+K V`.
- **Preview font size (A12):** "MDP: Increase / Decrease / Reset Preview Font Size", zoom buttons in the preview's title bar, and `Ctrl+=` / `Ctrl+-` / `Ctrl+0` while the preview is focused. Uses VS Code's own `markdown.preview.fontSize` setting (8–40 px, saved in User settings).
- **Preview theme (A10):** new setting `mdp.preview.theme` — Auto (follow VS Code), Light or Dark — and a colour-mode button / "MDP: Toggle Preview Theme" command that cycles through them. Code highlighting, alerts and Mermaid diagrams follow the chosen theme. Exports stay light.
### Project

- Now a public open-source project under the **MIT licence**, with `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue and pull-request templates, and `ROADMAP.md` (implemented features and the full future list).
- `THIRD_PARTY_NOTICES.md` lists every bundled package with its licence and ships inside the VSIX; `npm run notices` regenerates it and CI checks it is current.

## 0.1.0 — MVP

- Extends VS Code's built-in Markdown preview with: Mermaid diagrams (offline, theme-aware, inline errors), GitHub alerts, `:::` containers and details, `[TOC]`, task lists, footnotes, definition lists, abbreviations, sub/superscript, highlight, inserted text and emoji.
- **MDP: Export to Word (.docx)** — native Word file with real heading, list, table, quote and code styles (images, diagrams and equations are placeholders for now).
- **MDP: Export to PDF** — printed by the Microsoft Edge / Chrome / Chromium already installed; disabled in Restricted Mode.
- **MDP: Export to HTML** — one self-contained, offline page with math and diagrams.
- Exported HTML is sanitized: scripts, frames, forms, event handlers and `javascript:` links are removed.
