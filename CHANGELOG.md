# Changelog

## 0.2.0

- **Preview font size (A12):** "MDP: Increase / Decrease / Reset Preview Font Size", zoom buttons in the preview's title bar, and `Ctrl+=` / `Ctrl+-` / `Ctrl+0` while the preview is focused. Uses VS Code's own `markdown.preview.fontSize` setting (8–40 px, saved in User settings).
- **Preview theme (A10):** new setting `mdp.preview.theme` — Auto (follow VS Code), Light or Dark — and a colour-mode button / "MDP: Toggle Preview Theme" command that cycles through them. Code highlighting, alerts and Mermaid diagrams follow the chosen theme. Exports stay light.

## 0.1.0 — MVP (unreleased)

- Extends VS Code's built-in Markdown preview with: Mermaid diagrams (offline, theme-aware, inline errors), GitHub alerts, `:::` containers and details, `[TOC]`, task lists, footnotes, definition lists, abbreviations, sub/superscript, highlight, inserted text and emoji.
- **MDP: Export to Word (.docx)** — native Word file with real heading, list, table, quote and code styles (images, diagrams and equations are placeholders for now).
- **MDP: Export to PDF** — printed by the Microsoft Edge / Chrome / Chromium already installed; disabled in Restricted Mode.
- **MDP: Export to HTML** — one self-contained, offline page with math and diagrams.
- Exported HTML is sanitized: scripts, frames, forms, event handlers and `javascript:` links are removed.
