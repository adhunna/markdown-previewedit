# ADR-002 — Our own "Edit Preview" webview for formatting from the preview

- **Status:** Accepted (2026-10-12, by the owner)
- **Feature:** A24 — format from preview (Phase 1: text). Phase 2 (C12): style Mermaid diagrams.
- **Amends:** [ADR-001](001-stack-typescript-builtin-preview.md), which anticipated "an own webview that reuses the same markdown-it plugins" if needed.

## Context

The owner wants *reverse editing*: select text in the preview, pick formatting from a toolbar (heading, bold, list, case, colour, size …), and have the change written into the `.md` file.

The built-in preview cannot do this. Its script already holds the webview's one-time `acquireVsCodeApi()` handle, and the markdown extension only accepts its own fixed messages (`didClick`, `openLink`, `revealLine`, …; see `markdown-language-features/preview-src/index.ts`). A script we contribute through `markdown.previewScripts` therefore has no way to send an edit back to our extension.

Recent VS Code also ships a rich "Markdown Editor" (WYSIWYG). The catalog lists WYSIWYG editing as a non-goal.

## Decision

- Add a second, opt-in preview: **"MDP Edit Preview"** (`mdp.openEditPreview`, pencil button on Markdown files). The built-in preview stays the main reading preview.
- **Format only, no typing.** Text is still typed in the editor. The preview offers a selection toolbar; this keeps us out of WYSIWYG territory and makes every change a small, predictable Markdown edit.
- **Rendering** reuses the export engine (`createExportMarkdownIt`): the same plugins, KaTeX and sanitizer. A source-map plugin (`src/markdown/sourceMap.ts`) tags blocks with their lines and every text character with its source offset.
- **Edits** are computed by a pure module (`src/edit/format.ts`) and applied with `WorkspaceEdit` (undoable, file not saved automatically). The webview sends only the allowlisted, fully validated messages in `src/edit/messages.ts`, with the document version they refer to. A stale version is refused.
- **Colour and size** are not Markdown. They are written as `<span style="…">`, limited to `color`, `background-color` and a bounded `font-size` (`src/markdown/styles.ts`). The UI says they are HTML and do not show on GitHub. Exports keep exactly these declarations; Word maps them to run colour, shading and size.
- **Webview security:** CSP `default-src 'none'`, scripts only by nonce, `style-src 'unsafe-inline'` (needed by KaTeX and the colour spans), images from the extension, workspace and document folder, `https:` and `data:`. The page content is the sanitized export HTML; the toolbar is built with DOM APIs only.

## Consequences

- ✅ Formatting from the preview works with VS Code's stable API, without touching the built-in preview.
- ✅ One engine: preview, Edit Preview and exports render the same syntax.
- ⚠️ Two previews to keep visually close. The Edit Preview uses VS Code theme variables, `mdp.preview.theme` and `markdown.preview.fontSize`.
- ⚠️ Text that cannot be traced exactly to the source (generated TOC entries, emoji shortcodes, math) cannot be formatted from the preview; the toolbar ignores it.
- ⚠️ `src/edit/panel.ts` is a second file that imports `vscode` (besides `src/extension.ts`). Everything else in `src/edit/` stays VS Code-free and unit-tested.
- The message allowlist (J04) is back in scope and covered by `test/messages.test.ts`.
