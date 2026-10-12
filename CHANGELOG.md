# Changelog

## 0.1.0 — MVP (unreleased)

- Extends VS Code's built-in Markdown preview with: Mermaid diagrams (offline, theme-aware, inline errors), GitHub alerts, `:::` containers and details, `[TOC]`, task lists, footnotes, definition lists, abbreviations, sub/superscript, highlight, inserted text and emoji.
- **MDP: Export to Word (.docx)** — native Word file with real heading, list, table, quote and code styles (images, diagrams and equations are placeholders for now).
- **MDP: Export to PDF** — printed by the Microsoft Edge / Chrome / Chromium already installed; disabled in Restricted Mode.
- **MDP: Export to HTML** — one self-contained, offline page with math and diagrams.
- Exported HTML is sanitized: scripts, frames, forms, event handlers and `javascript:` links are removed.
