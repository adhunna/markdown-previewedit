# Changelog

All notable changes to Markdown PreviewEdit are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) (while below 1.0, a minor version may change behaviour).

Codes such as `A24` are Feature IDs from the [feature catalog](docs/02-feature-catalog.md). See the [roadmap](ROADMAP.md) for what's next.

## [Unreleased]

Nothing yet.

## [0.3.0] - 2026-10-13

First public release.

### Added

- **Format from the preview (A24).** A new **Edit Preview** (pencil button on Markdown files, or "PreviewEdit: Open Edit Preview"). Select text and use the toolbar for:
  - text style and headings
  - bold, italic, strikethrough, underline, highlight, code, subscript, superscript and links
  - bulleted, numbered and task lists, quotes and alert types
  - UPPER, lower, Title and Sentence case
  - text colour, fill and size, and clear formatting

  Changes are written into the `.md` file as normal, undoable edits. See [ADR-002](docs/adr/002-edit-preview-webview.md).
- **Colours in exports.** `<span style>` with text colour, background colour or font size is kept in HTML and PDF exports, and becomes coloured, shaded or resized text in Word.
- An extension icon, a [user guide](docs/user-guide.md), an [architecture guide](docs/architecture.md) and a [release guide](docs/releasing.md).
- Releases are built and published automatically, when a `v*` tag is pushed or when the Release workflow is run from the Actions tab.

### Changed

- **New name: Markdown PreviewEdit** (formerly *MarkDownPreview*), because the extension now edits as well as previews. The extension ID is `adhunna.markdown-previewedit`. Commands appear under **PreviewEdit** in the Command Palette, and settings moved from `mdp.*` to `previewEdit.*` (for example `previewEdit.preview.theme`). Settings from test builds must be set again.
- **Word export** now understands inline HTML: tags are no longer printed as text, and HTML blocks keep their visible text.
- Any CSS other than colour, background colour and font size (50–300 %) is removed from documents in all exports.

### Fixed

- An inline `<span style="…">` was shown as literal text in HTML and PDF exports.

### Security

- Edit Preview messages are allowlisted and fully validated, and edits made against an older version of the document are refused (J04).
- New hostile sample `samples/malicious/css-injection.md`; the Edit Preview renderer is tested against the whole hostile corpus.

## [0.2.0] - 2026-10-12

Not published; included in 0.3.0.

### Added

- **Full-screen preview (A23):** a button on the preview's title bar fills the VS Code window with the preview, hiding the other editors, side bars and panel. Click it again to restore.
- **Open Preview to the Side button (A01)** on every Markdown file (hold `Alt` to open it in the same tab).
- **Preview text size (A12):** zoom buttons, and `Ctrl+=` / `Ctrl+-` / `Ctrl+0` while the preview has focus. Uses VS Code's `markdown.preview.fontSize` (8–40 px).
- **Preview theme (A10):** `previewEdit.preview.theme` — Auto (follow VS Code), Light or Dark — with a colour-mode button. Code, alerts and Mermaid diagrams follow it; exports stay light.
- Open-source project files: MIT licence, contributing guide, code of conduct, security policy, issue and pull-request templates, roadmap.
- `THIRD_PARTY_NOTICES.md` lists every bundled package with its licence and ships inside the extension. `npm run notices` regenerates it, and CI checks it is current.

## [0.1.0] - 2026-10-12

Not published; included in 0.3.0.

### Added

- Extends VS Code's built-in Markdown preview with:
  - Mermaid diagrams (offline, theme-aware, with clear error boxes)
  - GitHub alerts, `:::` boxes and collapsible sections
  - `[TOC]`, task lists, footnotes, definition lists and abbreviations
  - subscript, superscript, highlight, inserted text and emoji
- **Export to Word (.docx):** a native Word file with real heading, list, table, quote and code styles. Images, diagrams and equations are placeholders for now.
- **Export to PDF:** printed by the Microsoft Edge, Chrome or Chromium already installed. Disabled in Restricted Mode.
- **Export to HTML:** one self-contained, offline page with math and diagrams.
- Exported HTML is sanitized: scripts, frames, forms, event handlers and `javascript:` links are removed.

[Unreleased]: https://github.com/adhunna/markdown-previewedit/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/adhunna/markdown-previewedit/releases/tag/v0.3.0
[0.2.0]: https://github.com/adhunna/markdown-previewedit/blob/develop/CHANGELOG.md#020---2026-10-12
[0.1.0]: https://github.com/adhunna/markdown-previewedit/blob/develop/CHANGELOG.md#010---2026-10-12
