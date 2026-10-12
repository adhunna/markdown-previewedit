# 05 — One-Week MVP (Fast Track)

> **Purpose:** Get a working, installable C#-powered Markdown preview on your Windows PC in **5 working days**, with a deliberately short feature list.
> **Replaces:** the scope of Phase 0 + Phase 1 in [04-implementation-plan.md](04-implementation-plan.md) for now. Everything not listed here moves to the roadmap (Phases 2–5) unchanged.
> **Assumes:** one developer working full-time with an AI coding agent; .NET 10 SDK, Node.js LTS and VS Code installed (see plan §7).

---

## 1. What "done in one week" means

At the end of Day 5 you can:

1. Install a `.vsix` file in VS Code (**Extensions view → `…` menu → Install from VSIX…**).
2. Open any `.md` file and run **"MDP: Open Preview to the Side"** (`Ctrl+K V`).
3. See it rendered by the **C# engine** — tables, GitHub alerts, math, Mermaid diagrams, highlighted code — following your VS Code theme, updating as you type, scrolling with the editor.
4. Run **"MDP: Export to Word (.docx)"** and open the result in Word 365.

**It is an alpha for personal/team use, not a Marketplace release.**

## 2. Shortcuts taken to fit one week

| Full plan | One-week version | Why it's safe to defer |
|---|---|---|
| NativeAOT binary per platform, 9 VSIX targets | **One universal VSIX**; engine is a framework-dependent .NET 10 DLL; the runtime is obtained by the **.NET Install Tool** extension (feature K08, moved earlier) | No per-platform builds or C++ toolchain needed. Code is still written AOT-safe, so switching later is cheap |
| Incremental DOM morphing (A05) | Replace the preview body on each update, **keep scroll position**, cache Mermaid SVGs by content hash | Fine for normal-sized documents |
| Two-way scroll sync (A07) | Editor → preview only (A06) | Preview → editor comes in Phase 2 |
| Shiki highlighting (B08) | **Stretch goal** on Day 4; fallback is plain monospace code blocks | Cosmetic |
| Full DOCX export (E04–E08) | **DOCX-lite**: headings, paragraphs, bold/italic/code, links, bullet/numbered lists, tables, code blocks, page title from front matter. No images, diagrams or equations yet | Shows the main differentiator with the least work |
| Full security corpus (J11) | ~10 hostile samples covering XSS, `javascript:` links, SVG scripts, path traversal | All security *rules* (CSP, sanitizer, no eval, no shell) still apply in full |
| Marketplace/Open VSX publishing, signing, CI matrix | Local `vsce package` + one GitHub Actions job (build + test) | Publishing needs decisions D1–D6 first |

## 3. Feature scope (IDs from [02-feature-catalog.md](02-feature-catalog.md))

| Area | In the one-week MVP |
|---|---|
| Preview | A01 open preview / to side · A04 live update (debounced) · A06 editor → preview scroll sync · A09 follows VS Code theme · A15 relative images & links |
| Markdown | B01 CommonMark · B02 GFM (tables, task lists, strikethrough, autolinks) · B03 GitHub alerts · B04 front matter (hidden, title used) · B05 heading IDs · B06 sanitized raw HTML · B07 math (KaTeX) · B08 code highlighting *(stretch)* |
| Diagrams | C01 Mermaid · C02 inline error box for broken diagrams |
| Export | **E04-lite** native DOCX export (see §2) |
| Security | J01 CSP + nonce · J02 sanitizer in engine **and** webview · J03 Restricted Mode = no raw HTML · J04 message allowlist · J05 no eval · J07 offline (all bundled) · J09 no telemetry · J11-lite (~10 cases) |
| Platform | K08 universal VSIX via .NET Install Tool (works on Windows, macOS, Linux wherever .NET 10 runs) |
| Settings | M01 — **5 settings only**: `mdp.preview.debounceMs`, `mdp.preview.scrollSync`, `mdp.math.enabled`, `mdp.mermaid.enabled`, `mdp.export.docx.openAfterExport` |
| Reliability | N01 engine supervisor (lazy start, restart once) · N02 log output channel · N04 error message instead of blank preview |

**29 features**; everything else waits.

## 4. Day-by-day plan

| Day | Goal | Tasks | End-of-day check |
|---|---|---|---|
| **1 — Wiring** | C# engine talks to VS Code | Replace `.gitignore`; scaffold `src/engine` (Protocol, Core, Host, Tests) and `src/extension` + `src/webview` (esbuild); JSON-RPC over stdio (StreamJsonRpc ⇄ vscode-jsonrpc); engine renders with plain Markdig; webview panel shows the HTML | **F5** → open a `.md` → preview shows HTML produced by C# |
| **2 — Markdown & live preview** | Correct, live, synced rendering | Markdig pipeline (GFM, alerts, front matter, heading IDs, math syntax); HtmlSanitizer allowlist; `data-line` attributes; debounced live update; editor → preview scroll sync; VS Code theme CSS variables; image/link paths via webview resource URIs | Typing updates the preview; scrolling the editor moves the preview |
| **3 — Rich content & security** | Math, diagrams, hardening | Bundle KaTeX + Mermaid (offline) + DOMPurify; Mermaid error box + SVG cache; CSP with nonce; typed message allowlist; Restricted Mode handling; error UI | Math and diagrams render; hostile samples don't execute script |
| **4 — Word export** | The differentiator | DOCX-lite exporter with the Open XML SDK (Markdig AST → Word built-in styles); "Export to Word" command + save dialog; 5 settings; engine supervisor & log channel; *stretch:* Shiki highlighting | Exported `.docx` opens cleanly in Word 365 with real Heading styles, lists and tables |
| **5 — Test & ship** | Installable alpha | Snapshot tests for `samples/features/*.md`; 10-case malicious corpus; DOCX validated with `OpenXmlValidator`; one CI job (build + test); `vsce package` → universal `.vsix`; install on Windows; README "How to use"; fix bugs found | VSIX installed from file on a clean Windows profile works end-to-end |

**Days 6–7 (buffer):** only for overflow and bug fixes — no new features.

## 5. Dependencies needed for the week (owner approval requested)

| Layer | Package | Licence | Purpose |
|---|---|---|---|
| Engine | Markdig | BSD-2 | Markdown parsing/rendering |
| Engine | HtmlSanitizer | MIT | HTML allowlist |
| Engine | DocumentFormat.OpenXml | MIT | DOCX export |
| Engine | YamlDotNet | MIT | Front matter |
| Engine | StreamJsonRpc | MIT | JSON-RPC server |
| Engine tests | xunit.v3, Verify.XunitV3 | MIT | Tests and snapshots |
| Shell | vscode-jsonrpc | MIT | JSON-RPC client |
| Shell (dev) | typescript, esbuild, eslint, @vscode/vsce, @vscode/test-cli | Apache-2.0 / MIT | Build, lint, package, test |
| Webview | katex, mermaid, dompurify | MIT / MIT / Apache-2.0 or MPL-2.0 | Math, diagrams, sanitizing |
| Webview *(stretch)* | shiki | MIT | Code highlighting |
| Runtime | `ms-dotnettools.vscode-dotnet-runtime` (extension dependency) | MIT | Installs the .NET 10 runtime for users |

## 6. Risks for the week

| Risk | Fallback |
|---|---|
| JSON-RPC wiring takes longer than Day 1 | Use newline-delimited JSON with `System.Text.Json` (no StreamJsonRpc) |
| Mermaid bundle/CSP issues | Load Mermaid as a separate lazy script file with the nonce; if still blocked, ship Mermaid on Day 5 or defer |
| DOCX lists/numbering in Open XML are fiddly | Ship bullets and plain numbered paragraphs first; proper numbering definitions afterwards |
| .NET Install Tool acquisition fails on a machine | Setting fallback: use `dotnet` from PATH |

## 7. After the week

Continue with the existing roadmap: Phase 2 (rich preview) → Phase 3 (PDF, full DOCX, smart paste, NativeAOT on all platforms, Marketplace v1.0). The 15-week estimate shrinks by roughly 3–4 weeks because Phase 0/1 work is already done.
