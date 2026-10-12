# ADR-001 — Stack for the MVP: TypeScript extension on VS Code's built-in preview

- **Status:** Accepted (2026-10-12, by the owner, for fastest delivery)
- **Supersedes for now:** the C#/.NET engine design in [03-architecture.md](../03-architecture.md) (kept as a future option)

## Context

The owner relaxed the C#/.NET preference and asked for the fastest possible delivery. The C# design needs a JSON-RPC bridge, a .NET runtime on users' machines (or nine NativeAOT builds), and a custom webview that re-implements what VS Code's preview already does (live update, scroll sync, theming, CSP, link handling, locked previews).

VS Code's built-in Markdown preview is extensible through stable contribution points: `markdown.markdownItPlugins` (an `extendMarkdownIt(md)` function returned from `activate()`), `markdown.previewScripts` and `markdown.previewStyles`. It already renders math (KaTeX, via the built-in Markdown Math extension) and front matter.

## Decision

- **100% TypeScript.** One universal VSIX, no runtime to install.
- **Extend the built-in preview** with markdown-it plugins and one preview script (Mermaid), instead of building our own webview.
- **Exports run in the extension host:** HTML (markdown-it + KaTeX + sanitize-html), PDF (puppeteer-core driving the *installed* Edge/Chrome/Chromium), Word (`docx` library mapping markdown-it tokens to Word styles).
- The same plugin set (`src/markdown/plugins.ts`) is used by the preview and by every exporter.

## Consequences

- ✅ Working MVP in hours; preview behaviour (scroll sync, live update, themes, security) comes from VS Code itself and stays current.
- ✅ Works in Remote/WSL/Codespaces and in VS Code forks (Cursor, VSCodium) unchanged.
- ⚠️ Less control over the preview UI: no custom sidebar, zoom or themes inside the built-in preview. If those become necessary, Phase 2 can add an own webview that reuses the same markdown-it plugins.
- ⚠️ Native Word features beyond "DOCX-lite" (templates, equations as OMML, diagrams as images) must be built in TypeScript with `docx`, or a C# helper can be reintroduced later for that part only.
- The security rules in AGENTS.md still apply; exported HTML is sanitized because it leaves VS Code's preview sandbox.
