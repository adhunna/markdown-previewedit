# 01 — Market Research

> **Purpose:** Understand the VS Code Markdown-preview market as of **October 2026**, find the gaps, and decide how a C#/.NET-based extension can win.
> **Researched on:** 2026-10-12. Versions and dates below were checked on that date (see [Sources](#sources)).
> **Limitation:** The VS Code Marketplace and Open VSX websites were unreachable from the research environment, so **install counts are not quoted**. Check them manually before making business decisions.

---

## 1. The baseline: what VS Code already does (don't rebuild it)

VS Code ships a built-in Markdown extension (`markdown-language-features`). As of the current source (VS Code ~1.140/1.141, now released **weekly**), it already provides:

| Area | Built-in capability |
|---|---|
| Preview | Preview / preview to side / locked preview, two-way scroll sync, double-click to switch to editor, custom `markdown.styles`, front-matter handling, security levels for remote content |
| **Rich editor (new in 2026)** | A built-in **"Markdown Editor"** custom editor (`vscode.markdown.editor`) with WYSIWYG-style editing, smart enter, active-block highlighting and experimental "rich links". Third-party reporting places it around VS Code 1.131–1.135. |
| Editing language features | Path & header completions, link validation (files, fragments, references), rename headers, find all references, update links on file move, smart select |
| Paste / drop | Paste & drop images/files (copies into workspace), paste URL as formatted link, audio/video snippets |
| Extensibility | `markdown.previewStyles`, `markdown.previewScripts`, `markdown.markdownItPlugins` contribution points |

**Implication:** a new extension must **not** compete on the basics (preview, image paste, link validation, WYSIWYG). It must win on **rendering depth, export quality, Office interop, security and performance**.

---

## 2. Competitive landscape

| Extension | Focus | Strengths | Weaknesses / gaps | What it means for us |
|---|---|---|---|---|
| **Markdown Preview Enhanced** (shd101wyy) — v0.8.30, June 2026; NCSA license; ~2.1k ★ | The "everything" previewer (the reference product) | Huge feature set: KaTeX/MathJax 4, Mermaid 11, PlantUML, Graphviz, Vega, WaveDrom, D2, TikZ; `@import`; code chunks; Reveal.js slides; PDF/HTML/eBook/Pandoc export; wiki links, backlinks, graph view; sidebar TOC; image lightbox; 10 UI languages | **Repeated serious security issues in 2025–2026** (see §3); heavy external dependencies (Chrome/Puppeteer, Pandoc, Prince, ImageMagick, Java, LaTeX); 74 settings + 26 commands → complex; Word export only via Pandoc; Node/markdown-it based | Match its *core* features, beat it on **security, simplicity and native Office export** |
| **Markdown All in One** (yzhang) | Editing productivity | Shortcuts, list editing, TOC generation, table formatter, math, auto-complete, print to HTML | Not a rich previewer; no PDF/DOCX | Complementary — **do not duplicate** its editing features |
| **Markdown PDF** (yzane) — v2.2 | Export to PDF/HTML/PNG/JPEG | Simple; auto-downloads Chrome; PlantUML, KaTeX; sanitizes HTML by default since 2.1 | Export only; downloads its own Chromium; no DOCX | Our PDF must be at least as easy, **without downloading a browser** (use installed Edge/Chrome) |
| **Marp for VS Code** | Slide decks | Export HTML/PDF/**PPTX**/PNG; Workspace Trust aware; **exposes an export tool to VS Code's AI agent** | Slides only | Good model for Workspace Trust handling and **AI-agent tools** |
| **Markdown Preview Mermaid Support** (bierner/mjbvz) | Mermaid in the built-in preview | Lightweight, official-feeling | Mermaid only | Mermaid must be first-class and offline in ours |
| **Office Viewer / Markdown Editor** (cweijan) | WYSIWYG editor + Office file viewers | WYSIWYG, export to PDF/DOCX/HTML | Mixed-purpose; PDF requires a Chromium path | Confirms demand for **DOCX export** inside VS Code |
| **markdownlint** (DavidAnson) | Linting | De-facto standard | — | Complementary — do not duplicate |
| **Foam** | Personal knowledge management | Wiki links, graph, backlinks | Not an export/preview tool | PKM features are **optional/late** for us |
| **New 2026 WYSIWYG wave** (Markdown for Humans, Milkdown-based editors, richdown, Flux Flow AI editor…) | WYSIWYG editing | Typora-like editing | Crowded, plus VS Code now has a built-in rich editor | WYSIWYG is a **non-goal** for v1 |

---

## 3. Deep dive: Markdown Preview Enhanced (MPE)

**Architecture:** TypeScript extension + the `crossnote` engine (Node.js, markdown-it, React webview). Optional parsers: Pandoc, and (experimental since April 2026) `markdown_yo` compiled to WebAssembly.

**Feature inventory** (from its `package.json` and changelog, v0.8.30):

- *Preview:* to side / full / locked / toggle lock, scroll sync, live update with debounce, single vs multiple previews, zoom, sidebar TOC (collapsible, resizable), image lightbox, zen mode, VS Code-themed context menu, auto-preview, preview themes incl. "follow VS Code theme".
- *Syntax:* markdown-it + typographer, linkify, emoji, wiki links (3 resolution modes), extended tables, CriticMarkup, `#tags`, `^block-id` references, callouts, colon-fenced blocks, front matter rendering options, HTML5 audio/video embeds.
- *Math:* KaTeX or MathJax 4 (configurable delimiters).
- *Diagrams:* Mermaid, PlantUML (jar/server), WebSequenceDiagrams, Graphviz, Vega/Vega-Lite, WaveDrom, Bitfield, D2 (CLI), TikZ, Kroki.
- *Composition:* `@import` of files, note embedding `![[note]]`, heading/block slicing.
- *Code chunks:* execute code blocks (Shift+Enter / run all).
- *Export:* HTML, PDF/PNG/JPEG via Puppeteer (Chrome), Prince PDF, eBook (Calibre), Pandoc (PDF, Word, RTF, Beamer, custom), GFM Markdown.
- *Notes:* graph view, backlinks, wiki-link completion/hover/follow, click-to-create notes, tag search.
- *Customisation:* custom CSS (global + workspace), `config.js`, `parser.js` hooks, custom `head.html`, image helper & uploaders (imgur, sm.ms, qiniu).

**Security track record (important lesson):**

| Release | Issue fixed |
|---|---|
| 0.8.21 (Mar 2026) | **CVE-2025-65716** — arbitrary JavaScript execution via malicious Markdown (sanitization added) |
| 0.8.22 (Mar 2026) | RCE via `.crossnote/parser.js` hooks |
| 0.8.28 (Jun 2026) | Command injection on Windows when opening files/links; `eval()` in WaveDrom rendering; `vm.runInNewContext` in Bitfield |
| 0.8.29 (Jun 2026) | RCE via `.crossnote/config.js` / `parser.js` evaluation (moved to a QuickJS sandbox) |
| 0.8.30 (Jun 2026) | Webview could dispatch any internal command (no allowlist); `<script>` injection through `head.html` |

**Lesson:** a previewer renders *untrusted content from cloned repositories*. Security must be designed in from day one (Workspace Trust, strict CSP, allowlisted messages, no `eval`, no shell, declarative-only config). This is our clearest differentiator.

---

## 4. Market trends (2026)

1. **VS Code moved to weekly releases and added a built-in rich Markdown editor.** The bar for "basic preview" is rising; extensions must offer depth.
2. **Security scrutiny of Markdown tooling.** CVEs and responsible disclosures hit MPE repeatedly; Markdown PDF changed its defaults to sanitize HTML.
3. **AI agents write and read Markdown.** `AGENTS.md`, `CLAUDE.md`, skills, specs and plans are Markdown; agents output Mermaid diagrams, GitHub alerts and task lists. VS Code exposes **Language Model Tools** so extensions (e.g. Marp) can offer actions to the built-in agent; MCP is the cross-tool standard.
4. **VS Code forks matter.** Cursor, Windsurf, VSCodium and others install from **Open VSX**; MPE started publishing there in March 2026.
5. **Microsoft 365 is embracing Markdown** (Message Center MC1261592: viewing/editing Markdown files in OneDrive and SharePoint). Bridging **Markdown ⇄ Word/Excel/Outlook** is increasingly valuable for Office users.
6. **Diagrams-as-code keep growing** (Mermaid 12, D2, Graphviz, Kroki).

---

## 5. Gaps & opportunities → our positioning

| # | Gap in today's market | Our answer |
|---|---|---|
| 1 | Feature-rich previewers have had critical security flaws | **Secure by design:** Workspace Trust, strict CSP + nonces, sanitizer in engine *and* webview, typed allowlisted messages, no `eval`, no shell, no executable config |
| 2 | Word export needs Pandoc (an extra install) | **Native DOCX export** with the Open XML SDK: real Word styles, corporate `.dotx` templates, editable equations, TOC field, footnotes |
| 3 | PDF export downloads or requires a Chromium path | **Use the browser already installed** (Microsoft Edge on every Windows PC; Chrome/Chromium elsewhere) |
| 4 | Pasting from Word/Outlook/Excel into Markdown is messy | **Smart paste** (HTML/Excel clipboard → clean Markdown/tables) and **DOCX → Markdown** conversion |
| 5 | Large documents get sluggish | Fast .NET engine (Markdig), incremental DOM updates, render budgets |
| 6 | Many settings (74 in MPE), many external tools | **Offline by default**, everything bundled, ≤ 30 settings for v1.0, per-document front-matter overrides |
| 7 | Few previewers integrate with AI agents | **Language Model Tools** ("export this to Word") and later an **MCP server** mode |

**Positioning statement (draft):**
*"The secure, Office-friendly Markdown preview for VS Code: everything you expect from Markdown Preview Enhanced (math, Mermaid, diagrams, imports, PDF) plus native Word export, smart paste from Office, and a security model built for repositories you didn't write."*

---

## 6. Can we build it in C#/.NET? — Yes, with an honest caveat

**The caveat:** VS Code only loads extensions through a **JavaScript/TypeScript entry point** running in the Extension Host (Node.js), and previews are **webviews** (HTML/JS in Chromium). A thin TypeScript layer is unavoidable.

**The design that makes C# the main language** (details in [03-architecture.md](03-architecture.md)):

- A **thin TypeScript "shell"** (activation, commands, webview panels, settings) — roughly 15–25% of the code.
- A **C# engine** (.NET 10 LTS) holding the real logic: parsing (Markdig), rendering, sanitizing, imports, TOC, export (DOCX/PDF/HTML), Office conversions — roughly 75–85% of the code.
- They talk over **JSON-RPC on stdin/stdout**, the same pattern Microsoft uses for the C# Dev Kit/Roslyn language server, the PowerShell extension and Bicep.

| .NET advantages | .NET costs |
|---|---|
| **Markdig 1.4** — fast, CommonMark 0.31.2-compliant, 20+ extensions, precise source positions (ideal for scroll sync) | Must ship native binaries per platform (9 VSIX targets) or rely on the .NET Install Tool |
| **Open XML SDK 3.5** — native DOCX/PPTX/XLSX read & write (Word export, Excel import) | Mermaid, KaTeX and Shiki are JavaScript → they run in the webview / a headless browser, not in .NET |
| Strong typing, NativeAOT single-file binaries (fast start, no runtime install) | NativeAOT restricts reflection; every library must be trim/AOT-safe (verify in Phase 0) |
| Mature libs: HtmlSanitizer, YamlDotNet, ReverseMarkdown, PuppeteerSharp, StreamJsonRpc | VS Code for the Web needs a separate .NET WebAssembly build (later phase) |

---

## Sources

- Markdown Preview Enhanced — repository, `package.json`, README, CHANGELOG: <https://github.com/shd101wyy/vscode-markdown-preview-enhanced>
- MPE documentation index: <https://github.com/shd101wyy/markdown-preview-enhanced/tree/master/docs>
- VS Code built-in Markdown extension manifest: <https://github.com/microsoft/vscode/tree/main/extensions/markdown-language-features>
- VS Code built-in Markdown editor (third-party report): <https://www.thurrott.com/dev/340776/visual-studio-code-now-includes-a-full-markdown-editor>
- VS Code September 2026 releases (v1.136–1.140): <https://github.blog/changelog/2026-10-01-github-copilot-in-vs-code-september-2026-releases/>, <https://community.intersystems.com/post/icymi-vs-code-updates-september-2026>
- Markdown All in One: <https://github.com/yzhang-gh/vscode-markdown>
- Markdown PDF: <https://github.com/yzane/vscode-markdown-pdf>
- Marp for VS Code: <https://github.com/marp-team/marp-vscode>
- Markdown Preview Mermaid Support: <https://github.com/mjbvz/vscode-markdown-mermaid>
- Office Viewer: <https://github.com/cweijan/vscode-office>
- WYSIWYG extensions (2026): <https://marketplace.visualstudio.com/items?itemName=concretio.markdown-for-humans>, <https://github.com/git-xing/md-wysiwyg-editor>, <https://github.com/StructWorks/richdown>
- Markdig: <https://github.com/xoofx/markdig>
- .NET Install Tool (`dotnet.acquire`): <https://github.com/dotnet/vscode-dotnet-runtime>
- StreamJsonRpc NativeAOT guidance: <https://github.com/microsoft/vs-streamjsonrpc/blob/main/docfx/docs/nativeAOT.md>
- .NET support timeline (.NET 10 LTS to Nov 2028; .NET 11 STS due Nov 2026): <https://www.infoworld.com/article/4191704/end-of-support-looms-for-net-8-and-net-9.html>, <https://www.gapvelocity.ai/blog/dotnet-10-vs-dotnet-11>
- Microsoft 365 Markdown in OneDrive/SharePoint (MC1261592): <https://mc.merill.net/message/MC1261592>
- Package versions: NuGet (`api.nuget.org`) and npm (`registry.npmjs.org`) registries, queried 2026-10-12.
