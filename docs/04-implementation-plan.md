# 04 — Implementation Plan

> **Purpose:** The step-by-step route from an empty repository to v1.0 on the VS Code Marketplace and Open VSX, and beyond.
> **Inputs:** [01-market-research.md](01-market-research.md) · [02-feature-catalog.md](02-feature-catalog.md) · [03-architecture.md](03-architecture.md)
> **Estimates** are in *ideal weeks for one full-time developer working with an AI coding agent*. Scale them to your real availability.

---

## 1. Phases at a glance

| Phase | Goal | Features | Est. | Exit criteria (all must be true) |
|---|---|---|---|---|
| **0 — Foundations & spikes** | Prove the C# engine model works; set up repo, CI, rules | — | 2 wk | F5 shows Markdown rendered by the C# engine · CI green · ADR-001…006 accepted |
| **1 — MVP (internal alpha)** | A fast, secure, good-looking preview on Windows x64 | all **P0** | 4 wk | All P0 done · performance budgets met · malicious corpus passes · VSIX installs via *Install from VSIX…* |
| **2 — Rich preview (public pre-release)** | Feature parity with the *core* of MPE | **P1** preview items (A, B, C, D, E01, J08, K04–K06, M02, N03) | 4 wk | Pre-release published to Marketplace + Open VSX (Windows x64) |
| **3 — Office & export → v1.0 GA** | The differentiators: PDF via installed browser, native DOCX, smart paste; all platforms | **P1** export/interop/platform items (B22, E02–E05, E08, E09, F01, F02, J10, K02, K03) | 5 wk | v1.0 on 9 platform targets · DOCX opens cleanly in Word 365 and passes `OpenXmlValidator` · README + docs complete |
| **4 — Power features (v1.x)** | Depth: more diagrams, Excel import, DOCX extras, AI tools | all **P2** | 8–10 wk | Shipped incrementally, one minor release per feature group |
| **5 — Reach (v2)** | Web (WASM), MCP, code chunks, notes, slides/PPTX | all **P3** | TBD | Driven by user demand and issues |

**≈ 15 weeks to v1.0.**

> **Update:** the MVP (v0.1.0) is built with the TypeScript stack from [ADR-001](adr/001-stack-typescript-builtin-preview.md), replacing Phase 0 + 1. Phases 2–5 below remain the feature roadmap; C#-specific tasks (NativeAOT, JSON-RPC, per-platform builds) apply only if the C# engine is reintroduced.

---

## 2. Phase 0 — Foundations & spikes (detailed)

| # | Task | Acceptance criteria |
|---|---|---|
| 0.1 | Replace the current `.gitignore` (a Next.js template) with one for VS Code extensions + .NET (`bin/`, `obj/`, `out/`, `dist/`, `*.vsix`, `node_modules/`, `.vscode-test/`, `TestResults/`) | `git status` clean after a full build |
| 0.2 | Scaffold `src/engine` solution: `global.json` (SDK 10.0.x, `rollForward: latestFeature`), `Directory.Build.props` (`net10.0`, nullable, `TreatWarningsAsErrors`, `IsAotCompatible`, analyzers), `Directory.Packages.props` (central package management) | `dotnet build` and `dotnet test` pass |
| 0.3 | Scaffold `src/extension` (TypeScript strict, esbuild, ESLint flat config, `@vscode/test-cli`) | `npm run build`, `npm run lint`, `npm test` pass |
| 0.4 | Scaffold `src/webview` (TypeScript, esbuild, no UI framework) | Bundle built into the extension's `media/` |
| 0.5 | **Spike S1 — NativeAOT JSON-RPC:** `Markdown PreviewEdit.Host` with StreamJsonRpc (`SystemTextJsonFormatter`, source-generated contracts); `ping` + `document/render`; publish NativeAOT `win-x64`; TS client spawns it | Zero AOT/trim warnings · cold start < 150 ms · binary size recorded · fallback decision recorded in ADR-002 |
| 0.6 | **Spike S2 — render + scroll sync:** Markdig with precise source locations → `data-line-*` attributes + block hashes; webview morphs blocks and syncs scroll | Typing in a 50 KB doc updates preview < 100 ms; scroll sync both ways |
| 0.7 | **Spike S3 — library AOT check:** Open XML SDK (heading + table + image DOCX), HtmlSanitizer, YamlDotNet, ReverseMarkdown, PuppeteerSharp (PDF via installed Edge) | Each library: works under NativeAOT ✅ / needs workaround ⚠️ / blocked ❌ — results in ADR-001 |
| 0.8 | **Spike S4 — dev & fallback mode:** shell runs the engine framework-dependent (via `dotnet` or the .NET Install Tool's `dotnet.acquire`) | F5 debugging works with C# breakpoints (attach to engine process) |
| 0.9 | CI (GitHub Actions): engine build+test on `windows-latest` and `ubuntu-latest`; extension build+lint+test; package a `win32-x64` VSIX as an artifact | Green on `develop` |
| 0.10 | Write `docs/adr/001…006`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` (after decision D2) — ✅ done in v0.2.0 | Reviewed and accepted by the owner |
| 0.11 | Fill in the **Commands** section of `AGENTS.md` with the real build/test/package commands | Agent can build and test from a clean clone using only AGENTS.md |

## 3. Phase 1 — MVP (detailed)

| Epic | Work items | Feature IDs |
|---|---|---|
| 1.1 Engine core | Markdig pipeline (CommonMark, GFM, alerts/callouts, front matter, heading IDs, raw HTML, math syntax); source map + block hashes; sanitizer; render timings | B01–B07, J02, N02 |
| 1.2 Shell | Commands & keybindings; live update with debounce + cancellation; engine supervisor (lazy start, restart, shutdown); first ≤ 10 settings; Workspace Trust gating; link handling; CSP + nonce; message allowlist; no telemetry | A01, A04, A15, N01, M01, J01, J03, J04, J09 |
| 1.3 Webview | Block morphing; editor → preview scroll sync; VS Code theme variables; KaTeX; Shiki highlighting; Mermaid + inline errors + timeouts; DOMPurify; error UI | A05, A06, A09, B07, B08, C01, C02, N04 |
| 1.4 Security | Malicious-Markdown corpus in `samples/malicious/` run in CI (engine snapshot + headless browser "no script executed" check); lint bans on `eval`, `new Function`, `innerHTML` without sanitizer, `exec`/`shell: true` | J05, J06, J07, J11 |
| 1.5 Packaging | NativeAOT `win-x64` engine inside a `win32-x64` VSIX | K01 |

## 4. Phases 2–5 (epic level)

**Phase 2 — Rich preview:** locked/multiple previews, two-way scroll sync, block highlight, themes incl. "Word document" look, custom CSS, zoom, TOC sidebar, find, restore on restart, large-document mode, context menu; code-block extras, footnotes, emoji, containers, `[TOC]`, line-break mode; diagram cache, Graphviz; `@import` of Markdown/code/CSV with safety checks and live refresh; HTML export; remote-content security levels; accessibility; per-document front-matter options; issue reporter. **Set up publishing** (publisher account, Open VSX namespace, pre-release channel).

**Phase 3 — Office & export (v1.0):** render host (headless Edge/Chrome via CDP); PDF with options; native DOCX with corporate templates, diagrams as images, page breaks; copy as rich text; smart paste from Word/Outlook/Excel; supply-chain hardening (SBOM, signing, scanning); **all 9 platform targets**; Remote/WSL/Containers verification.

**Phase 4 — Power features (v1.x):** Excel-range import, DOCX extras (TOC field, properties, headers/footers), editable Word equations (OMML), DOCX → Markdown, batch export, presets, export on save, PNG snapshot, GFM export, more diagrams (PlantUML, Kroki, Vega, pan/zoom, copy as SVG/PNG), wiki links, grid tables, typography, media, figures, CJK, localization, Language Model Tools, workspace JSON config + schemas, universal fallback VSIX, status-bar stats, lightbox.

**Phase 5 — Reach (v2):** VS Code for the Web (.NET WebAssembly engine), MCP server mode, code chunks (with guard rails), notes features (backlinks, graph), PPTX export, CriticMarkup → Word tracked changes, Pandoc bridge, charts, zen mode, public extension API.

---

## 5. Testing strategy

| Level | Tooling | What is tested |
|---|---|---|
| Engine unit + snapshot | xUnit v3 + Verify | Each Markdown feature: `samples/features/*.md` → approved HTML snapshots. Snapshot changes are reviewed, never blindly accepted |
| Spec compliance | Markdig's CommonMark/GFM specs + our extension specs | Regressions in parsing |
| Security | `samples/malicious/*` corpus (OWASP XSS cheat-sheet payloads, `javascript:` URLs, SVG scripts, path traversal in imports, shell metacharacters in file names, ReDoS strings, 50 MB files) | Sanitizer output + headless-browser run proves **no script executes** |
| DOCX | Open XML `OpenXmlValidator` + structural assertions; manual check in Word 365 per release | Valid, editable Word files |
| Performance | BenchmarkDotNet (engine); timing assertions in integration tests | Budgets in architecture §7; CI fails on > 20 % regression |
| Extension integration | `@vscode/test-cli` / `@vscode/test-electron` (stable + insiders) | Commands, preview lifecycle, trust behaviour, engine restart |
| Webview | Playwright against the bundled webview page with fake messages | Morphing, scroll sync, renderers, CSP violations (none allowed) |
| Manual release checklist | `docs/release-checklist.md` (created in Phase 2) | Windows 10/11, macOS, Linux, Remote-WSL smoke tests |

## 6. CI/CD and release

- **CI on every push/PR:** engine build + tests, extension lint + tests, webview tests, security corpus, AOT publish for `win-x64` (Phase 1) → all RIDs (Phase 3).
- **NativeAOT cannot cross-compile between operating systems**, so the release matrix uses native runners: Windows (x64, arm64), Linux (x64, arm64; Alpine via container), macOS (x64, arm64).
- **Packaging:** one `vsce package --target <platform>` per target (`win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`, `linux-armhf`, `alpine-x64`, `alpine-arm64`, `darwin-x64`, `darwin-arm64`), plus the universal fallback VSIX (K08, Phase 4).
- **Publishing:** `vsce publish --packagePath …` and `ovsx publish --target …` from a tagged release workflow; tokens stored as GitHub Actions secrets.
- **Versioning:** SemVer. Following VS Code's guidance, **even minor = stable** (`1.0.x`, `1.2.x`), **odd minor = pre-release** (`1.1.x`, `1.3.x`).
- **Signing:** Marketplace signs VSIX packages; additionally sign Windows engine binaries (Authenticode) so antivirus and corporate policies don't block them (decision D6).
- **`engines.vscode`:** pin to a VS Code version at least ~3 months old at release time; test on stable and insiders (VS Code now ships weekly).

---

## 7. Developer setup on Windows (your machine)

Open **Windows Terminal** or **PowerShell** (Start → type *PowerShell*) and run:

```powershell
winget install --id Microsoft.VisualStudioCode -e
winget install --id Microsoft.DotNet.SDK.10 -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
```

NativeAOT on Windows also needs the **MSVC C++ toolchain**: install *Visual Studio Build Tools* (2022 or 2026) and, in the **Visual Studio Installer**, tick the **"Desktop development with C++"** workload.

Recommended VS Code extensions:

```powershell
code --install-extension ms-dotnettools.csdevkit
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-vscode.extension-test-runner
```

Check everything (open a **new** terminal first):

```powershell
dotnet --version   # 10.0.x
node --version     # an LTS version
git --version
```

After Phase 0: clone the repo, open the folder in VS Code, press **F5** → an *Extension Development Host* window opens → open any `.md` file → run **"PreviewEdit: Open Preview to the Side"** from the Command Palette (`Ctrl+Shift+P`).

> Windows 10 has been past Microsoft's end of mainstream support since 14 Oct 2025. If an installer above refuses to run, that is the likely cause; CI also tests on current Windows runners.

---

## 8. Risks & mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | A key library isn't NativeAOT-compatible (Open XML SDK, PuppeteerSharp, YamlDotNet…) | High | Spike S3 in week 1–2; fallbacks: alternative library, AOT-safe subset, or ship that feature in the framework-dependent build |
| R2 | Unsigned `.exe` flagged by antivirus / blocked by corporate policy | High | Authenticode-sign Windows binaries; universal fallback VSIX runs via `dotnet` |
| R3 | JS-only renderers (Mermaid, KaTeX, Shiki) needed for exports | Medium | Render host design (architecture §5) |
| R4 | Scope creep toward MPE's full surface | High | Feature IDs + priorities; non-goals list; ≤ 30 settings rule |
| R5 | VS Code's built-in preview/rich editor keeps improving | Medium | Compete on export, Office interop, security, diagrams — not basics |
| R6 | Weekly VS Code releases change APIs/behaviour | Low–Medium | Only stable APIs; test on insiders in CI |
| R7 | Remote/WSL/Container users need Linux/Alpine binaries early | Medium | Linux x64 builds in CI from Phase 1 even before release |
| R8 | IPC overhead on very large documents | Low | Block hashing, only changed blocks sent; measured in S2 |
| R9 | macOS Gatekeeper / binary permissions after VSIX install | Low–Medium | Verify in Phase 3; set executable bit at activation; sign if required |

## 9. Decisions (owner to confirm — recommended default in **bold**)

**Decided:** D1 (name: Markdown PreviewEdit), D2 and D8 — the project is public open source under the MIT licence (v0.2.0); D3 — superseded by [ADR-001](adr/001-stack-typescript-builtin-preview.md) (one universal TypeScript VSIX). The rest are still open.

| ID | Decision | Recommendation / outcome |
|---|---|---|
| D1 | Product display name, Marketplace publisher ID, command/setting prefix | ✅ **Decided (v0.3.0): Markdown PreviewEdit**, extension ID `adhunna.markdown-previewedit`, prefix `previewEdit.` (formerly the codename MarkDownPreview with prefix `mdp.`). Check the Marketplace for conflicts before publishing there. |
| D2 | Licence | ✅ **Decided: MIT** — see `LICENSE`; bundled packages and their licences in `THIRD_PARTY_NOTICES.md` (includes elkjs, EPL-2.0, via Mermaid). The EPL-2.0 `elkjs` inside Mermaid is accepted as an unmodified bundled library (owner decision, v0.3.0; see AGENTS.md §3.4). |
| D3 | Engine hosting model | ✅ **Superseded** by ADR-001: no separate engine, one universal VSIX |
| D4 | Minimum VS Code version | **A version ~3 months older than the release date** |
| D5 | Publish to Open VSX too | **Yes** (Cursor, Windsurf, VSCodium users) |
| D6 | Code-signing for Windows binaries | **Yes** — a code-signing service or OV certificate before v1.0 |
| D7 | Notes/PKM features (wiki links, graph) | **Defer** to Phase 4/5 |
| D8 | Business model | ✅ **Decided: free and open source** (public repository) |
