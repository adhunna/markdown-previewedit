# AGENTS.md — Terms and Rules for AI Coding Agents

This file is the **operating manual for any AI coding agent** (Claude Code, GitHub Copilot, Codex, Cursor, …) working in this repository. Humans should follow it too. If anything here conflicts with a request in a chat, **ask the owner** before acting.

---

## 1. Mission

Build a **secure, fast, Office-friendly Markdown preview extension for VS Code**, comparable to *Markdown Preview Enhanced*, with the core logic written in **C# / .NET 10** and a thin TypeScript layer.

Read these before any non-trivial change — they are the source of truth:

| File | Use it for |
|---|---|
| [docs/01-market-research.md](docs/01-market-research.md) | Why we build what we build |
| [docs/02-feature-catalog.md](docs/02-feature-catalog.md) | **What** to build — every task maps to a Feature ID |
| [docs/03-architecture.md](docs/03-architecture.md) | **Where** code goes and **how** the parts talk |
| [docs/04-implementation-plan.md](docs/04-implementation-plan.md) | **When** — phases, order, exit criteria |
| [docs/05-one-week-mvp.md](docs/05-one-week-mvp.md) | **Now** — the one-week MVP scope and day-by-day plan |
| `docs/adr/` | Accepted decisions (created in Phase 0) |

**Current phase:** One-week MVP ([docs/05-one-week-mvp.md](docs/05-one-week-mvp.md)) — replaces Phase 0 + 1 scope. Work only on the Feature IDs listed there unless the owner asks. In this phase the engine ships framework-dependent (universal VSIX), but code must still be AOT-safe (§3.3).

---

## 2. Glossary (terms used in this repo)

| Term | Meaning |
|---|---|
| **Extension** | The whole product installed in VS Code (one `.vsix` per platform). |
| **Shell** | The TypeScript code running in VS Code's Extension Host (`src/extension`). Thin: VS Code API only. |
| **Engine** | The C# / .NET 10 process (`src/engine`) that parses, renders, sanitizes, imports and exports. Holds most of the logic. |
| **Webview** | The sandboxed browser page that displays the preview (`src/webview`). Runs JS-only renderers (KaTeX, Mermaid, Shiki). |
| **Render host** | A browser used to produce final output for exports: the live webview, or headless installed Edge/Chrome driven by the engine. |
| **Protocol** | The JSON-RPC 2.0 contract between shell and engine. Source of truth: C# records in `MarkDownPreview.Protocol`. |
| **Message** | A typed `postMessage` between webview and shell. Only allowlisted message types exist. |
| **Block** | A top-level rendered element (paragraph, heading, table, diagram…) with an `id`, a content `hash` and its source line range. |
| **Source map** | `data-line-start` / `data-line-end` attributes that link preview blocks to editor lines (scroll sync). |
| **Morph** | Updating only the changed blocks in the webview DOM instead of replacing the whole page. |
| **Sanitizer** | The allowlist-based HTML cleaner. Runs in the engine (HtmlSanitizer) **and** in the webview (DOMPurify). |
| **CSP / nonce** | The webview's Content-Security-Policy; scripts run only if they carry the random per-load nonce. |
| **Workspace Trust / Restricted Mode** | VS Code's trust state. In Restricted Mode, risky features (scripts, external tools, code chunks, outside-workspace imports) are off. |
| **NativeAOT** | Compiling the engine ahead-of-time into a single native executable per platform — no .NET install needed. |
| **AOT-safe** | Code that works under NativeAOT and trimming: no runtime reflection, no `dynamic`, System.Text.Json source generators only. |
| **RID / target** | .NET runtime identifier (`win-x64`) and matching VSIX target (`win32-x64`). We ship 9 targets. |
| **Platform-specific VSIX / universal VSIX** | Package containing one platform's engine binary / package that obtains .NET via the .NET Install Tool. |
| **Feature ID** | Code like `E04` from the feature catalog. Every commit, branch and PR references one. |
| **Phase** | A delivery stage (0–5) in the implementation plan, with exit criteria. |
| **P0–P3** | Feature priority: P0 = MVP, P1 = v1.0, P2 = v1.x, P3 = later. |
| **ADR** | Architecture Decision Record in `docs/adr/NNN-title.md`. |
| **Snapshot (golden) test** | Test comparing output to an approved file (Verify). Changes must be reviewed, not auto-accepted. |
| **Malicious corpus** | `samples/malicious/` — hostile Markdown that must never execute script or escape the workspace. |
| **Front matter** | YAML block at the top of a Markdown file; carries title and per-document options. |
| **Language Model Tool / MCP** | Ways to expose our actions to AI agents (VS Code agent mode / Model Context Protocol). |
| **Open VSX** | The open extension registry used by Cursor, Windsurf, VSCodium, etc. |

---

## 3. Golden rules (non-negotiable)

### 3.1 C#-first

1. New logic goes into the **engine (C#)** unless it *needs* the VS Code API (→ shell) or the DOM / a JavaScript-only library (→ webview). When unsure: engine.
2. The shell and webview stay thin. Do not re-implement parsing, rendering, sanitizing or export logic in TypeScript.

### 3.2 Security (a Markdown file is untrusted input)

1. **Never** use `eval`, `new Function`, `vm.runIn*`, string-built `setTimeout`, or any "execute this text" mechanism — in the shell, webview or engine.
2. **Never** assign unsanitized content to `innerHTML`/`outerHTML`/`insertAdjacentHTML`. All HTML passes the engine sanitizer **and** DOMPurify.
3. **Never** start a process through a shell. C#: `UseShellExecute = false` + `ArgumentList`. Node: `spawn`/`execFile` with an args array, never `exec` or `shell: true`.
4. **Never** loosen the webview CSP (`'unsafe-eval'`, `'unsafe-inline'` scripts, wildcard sources). `'wasm-unsafe-eval'` is allowed only for bundled WebAssembly.
5. Webview → shell messages: only allowlisted types, validate every field, never accept a command name, file path to write, or arbitrary URI from the webview.
6. Respect **Workspace Trust**: anything that runs code, calls external tools, reads outside the workspace, or loads custom `<head>` content is disabled in Restricted Mode.
7. Configuration is **declarative JSON only**. Never add executable config/plugin files.
8. **Offline by default**: no CDN URLs, no network calls unless the user enabled a labelled opt-in feature. No telemetry.
9. Every security-relevant fix adds a case to `samples/malicious/`.

### 3.3 AOT-safety (engine)

1. `IsAotCompatible=true`; trim/AOT warnings are **errors** — never suppress them without an ADR.
2. JSON: System.Text.Json **source generation** only (`JsonSerializerContext`). No Newtonsoft.Json.
3. No runtime reflection, `Activator.CreateInstance` on unknown types, `dynamic`, or `Assembly.Load`.

### 3.4 Protocol discipline

1. Change the C# records in `MarkDownPreview.Protocol` **first**, regenerate the TypeScript types, update both sides and their tests **in the same commit**.
2. Never hand-edit generated files (they carry a "generated" header).
3. Breaking protocol changes bump `protocolVersion`.

### 3.5 Dependencies

1. Do not add a NuGet or npm package without the owner's approval. When proposing one, state: purpose, licence, size, maintenance status, AOT compatibility (for NuGet), and alternatives.
2. Allowed licences: MIT, BSD, Apache-2.0, ISC, MS-PL, EPL-2.0 (tools only). **No GPL/AGPL/LGPL in shipped code.**
3. Versions are pinned (`Directory.Packages.props`, `package-lock.json`). Commit lockfiles.

### 3.6 Performance

Keep within the budgets in [docs/03-architecture.md §7](docs/03-architecture.md#7-performance-budgets-verified-in-phase-0-enforced-in-ci-from-phase-1). If a change may affect rendering speed, run the benchmarks and report the numbers.

### 3.7 Scope

1. Work on the **current phase** and on the Feature IDs you were given. Do not add features, settings or commands that are not in the catalog — propose them instead.
2. Respect the **non-goals** in the feature catalog (no WYSIWYG, no linting, no image upload, no executable config).
3. v1.0 has **≤ 30 settings**. Prefer good defaults and front-matter overrides over new settings.

---

## 4. Workflow

1. **Understand** — read the Feature ID row, the relevant architecture section and existing code. Restate the goal in one or two sentences before starting.
2. **Plan** — for anything over ~1 hour or touching more than one layer, write a short plan (files, steps, tests) and share it first.
3. **Implement** in small, focused commits.
4. **Test** — add/update tests at the right level (see §6). Run the fast checks locally.
5. **Document** — update the feature catalog *Status* column, settings docs, `CHANGELOG.md` (from Phase 1), and ADRs when a decision changes.
6. **Report** — say what was done, what was verified (with command output), and what was **not** verified. Never claim a test passed that you did not run.

### Git rules

- Integration branch: **`develop`**. Never commit directly to `main`. Feature branches: `feat/<feature-id>-<slug>` (e.g. `feat/E04-docx-export`), fixes: `fix/<slug>`.
- **Conventional Commits** with the Feature ID as scope: `feat(E04): write tables to DOCX`, `fix(A06): scroll sync drift on long tables`, `docs: …`, `test: …`, `chore: …`.
- Never force-push shared branches, rewrite published history, or delete branches without approval.
- Open pull requests only when the owner asks.
- Never commit secrets, tokens, personal data, generated binaries, or `*.vsix` files.

---

## 5. Commands

> **To be filled in by Phase 0, task 0.11.** Until then there is no buildable code. Expected shape:

| Purpose | Command (planned) |
|---|---|
| Build engine | `dotnet build src/engine/MarkDownPreview.sln` |
| Test engine | `dotnet test src/engine/MarkDownPreview.sln` |
| Format engine | `dotnet format src/engine/MarkDownPreview.sln` |
| AOT publish (Windows x64) | `dotnet publish src/engine/MarkDownPreview.Host -r win-x64 -c Release -p:PublishAot=true` |
| Build extension + webview | `npm ci && npm run build` (in `src/extension`) |
| Lint / test extension | `npm run lint` · `npm test` |
| Package VSIX | `npx vsce package --target win32-x64` |

---

## 6. Coding standards

### C# (engine)

- .NET 10, C# 14, `<Nullable>enable</Nullable>`, file-scoped namespaces, `sealed` by default, `record` for protocol/data types.
- Async all the way with `CancellationToken` on every public async method; no `.Result`/`.Wait()`.
- No static mutable state; dependencies passed via constructors.
- Public APIs get XML doc comments; internal code gets comments only where intent isn't obvious.
- Logging goes to **stderr** (stdout is reserved for JSON-RPC).
- Run `dotnet format` before committing.

### TypeScript (shell & webview)

- `strict: true`; no `any` (use `unknown` + narrowing); no non-null assertions without a comment.
- Bundle with esbuild; `@types/vscode` matches `engines.vscode`.
- Use only **stable** VS Code APIs (no proposed APIs).
- Every `Disposable` is registered in `context.subscriptions` or disposed explicitly.
- Webview: no UI framework; keep the bundle small; lazy-load heavy renderers (Mermaid, Shiki languages).

### Naming

- Commands: `mdp.<verb><Object>` (e.g. `mdp.openPreviewToSide`); settings: `mdp.<area>.<name>` (e.g. `mdp.export.browserPath`). Prefix `mdp` is a placeholder until decision **D1** is made.
- C# namespaces: `MarkDownPreview.<Project>.<Area>`.

---

## 7. Testing rules

1. Every bug fix comes with a test that fails before the fix.
2. Every Markdown feature has a sample in `samples/features/` and an approved snapshot.
3. Snapshot updates must be explained in the commit message; never bulk-accept snapshot changes.
4. The malicious corpus and the CSP check must pass before any merge to `develop`.
5. Do not skip, disable or delete tests to make a build pass. If a test is wrong, explain why and fix the test.

## 8. Definition of Done

A Feature ID is **Done** when:

- [ ] Behaviour matches the catalog row and acceptance criteria in the plan
- [ ] Code is in the right layer (§3.1) and follows the standards (§6)
- [ ] Tests added and passing (unit/snapshot + integration where relevant)
- [ ] Security rules (§3.2) respected; malicious corpus passes
- [ ] Performance budgets still met
- [ ] Works in Restricted Mode (degrades safely) and in a Remote/WSL window (from Phase 3)
- [ ] Docs updated: catalog *Status*, settings/README, CHANGELOG
- [ ] No new warnings; lint and format clean

---

## 9. Ask the owner first (never decide alone)

- Adding, removing or upgrading a dependency (major versions)
- Any change to the security model, CSP, trust behaviour or message allowlist
- Breaking protocol changes; renaming public commands or settings
- Adding a setting, command or feature not in the catalog
- Anything involving publishing, version bumps, signing, CI secrets or release workflows
- Deleting files or directories you did not create in the current task
- Decisions listed as open (D1–D8) in the implementation plan

## 10. Communication style

- Lead with the outcome; keep reports short and concrete.
- Separate **verified** (ran it, saw the output) from **assumed**.
- When blocked, say exactly what is blocking and what you need.
- Use the glossary terms above consistently.
