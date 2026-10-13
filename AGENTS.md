# AGENTS.md — Terms and Rules for AI Coding Agents

This file is the **operating manual for any AI coding agent** (Claude Code, GitHub Copilot, Codex, Cursor, …) working in this repository. Humans should follow it too. If anything here conflicts with a request in a chat, **ask the owner** before acting.

---

## 1. Mission

Build a **secure, fast, Office-friendly Markdown preview extension for VS Code**, comparable to *Markdown Preview Enhanced*. This is a **public open-source project** (MIT licence): write code, commits, issues and docs for outside contributors to read.

**Stack (ADR-001):** 100% **TypeScript**. The extension **extends VS Code's built-in Markdown preview** (markdown-it plugins + a preview script) and runs exports (Word, PDF, HTML) in the extension host. The C# / .NET engine in `docs/03-architecture.md` is a *future option*, not current work.

Read these before any non-trivial change — they are the source of truth:

| File | Use it for |
|---|---|
| [docs/architecture.md](docs/architecture.md) | **How** the current code fits together; where to change things |
| [docs/user-guide.md](docs/user-guide.md) | What users see: every button, command, setting and syntax — keep it in sync |
| [docs/01-market-research.md](docs/01-market-research.md) | Why we build what we build |
| [docs/02-feature-catalog.md](docs/02-feature-catalog.md) | **What** to build — every task maps to a Feature ID |
| [docs/03-architecture.md](docs/03-architecture.md) | Long-term C# design (future option; see ADR-001 for the current stack) |
| [docs/04-implementation-plan.md](docs/04-implementation-plan.md) | **When** — phases, order, exit criteria |
| [ROADMAP.md](ROADMAP.md) | **Now** — what is implemented and the prioritised future list |
| [docs/05-one-week-mvp.md](docs/05-one-week-mvp.md) | Original one-week C# plan (superseded) |
| [docs/adr/](docs/adr/) | Accepted decisions — start with ADR-001 (stack) |

**Current phase:** v0.3.0 released (see `CHANGELOG.md`). Next work is chosen by the owner from the *Next — v1.0* list in `ROADMAP.md`. Do not start large features without a plan approved by the owner.

---

## 2. Glossary (terms used in this repo)

| Term | Meaning |
|---|---|
| **Extension** | The whole product installed in VS Code (one universal `.vsix`). Entry point: `src/extension.ts`. |
| **Built-in preview** | VS Code's own Markdown preview (`markdown.showPreview`). We extend it; we do not replace it. |
| **Plugins** | Our markdown-it extensions in `src/markdown/` (alerts, containers, TOC, task lists, Mermaid placeholder, extra syntax). One set, used by the preview **and** all exports. |
| **Preview script** | Browser code injected into the built-in preview via `markdown.previewScripts` (`src/preview/mermaid.ts`). Also embedded in exported HTML/PDF. |
| **Edit Preview** | Our own webview (`src/edit/`, ADR-002) that shows the document and lets the user format selected text from a toolbar (A24). The built-in preview cannot send messages to extensions, so this is separate from it. |
| **Source map** | `src/markdown/sourceMap.ts`: `data-line`/`data-line-end`/`data-block` on blocks and `<span data-src>` on text in the Edit Preview, so a selection maps to exact source offsets. |
| **Exporters** | `src/export/` — HTML (`html.ts`), PDF (`pdf.ts` + `browser.ts`), Word (`docx.ts`), and the sanitizing export engine (`engine.ts`). |
| **Render host** | The installed Edge/Chrome/Chromium that PDF export drives headless (never downloaded). |
| **Engine (future)** | The optional C# / .NET process described in `docs/03-architecture.md`. Not part of the current code. |
| **Source-line attributes** | `class="code-line" data-line="N"` that VS Code adds to block tokens for scroll sync. Custom renderers must keep them (`sourceLineAttrs()` in `src/markdown/util.ts`). |
| **Sanitizer** | The allowlist-based HTML cleaner. In the preview: VS Code's own (DOMPurify + CSP). In exports: `sanitize-html` plus the inline-tag allowlist in `src/export/engine.ts`. |
| **CSP** | The preview's Content-Security-Policy, owned by VS Code. Our preview script must work within it. |
| **Workspace Trust / Restricted Mode** | VS Code's trust state. In Restricted Mode, risky features (scripts, external tools, code chunks, outside-workspace imports) are off. |
| **Feature ID** | Code like `E04` from the feature catalog. Every commit, branch and PR references one. |
| **Phase** | A delivery stage (0–5) in the implementation plan, with exit criteria. |
| **P0–P3** | Feature priority: P0 = MVP, P1 = v1.0, P2 = v1.x, P3 = later. |
| **ADR** | Architecture Decision Record in `docs/adr/NNN-title.md`. |
| **Snapshot (golden) test** | Test comparing output to an approved file (Verify). Changes must be reviewed, not auto-accepted. |
| **Malicious corpus** | `samples/malicious/` — hostile Markdown; tests prove exports contain no scripts, handlers, frames or dangerous URLs. |
| **Feature tour** | `samples/features/all.md` — one document using every supported syntax; the main manual test file. |
| **Front matter** | YAML block at the top of a Markdown file; carries title and per-document options. |
| **Language Model Tool / MCP** | Ways to expose our actions to AI agents (VS Code agent mode / Model Context Protocol). |
| **Open VSX** | The open extension registry used by Cursor, Windsurf, VSCodium, etc. |

---

## 3. Golden rules (non-negotiable)

### 3.1 Built-in first

1. If VS Code's built-in Markdown preview already does something (math, front matter, scroll sync, link validation, image paste…), **do not rebuild it**.
2. New syntax = a markdown-it plugin in `src/markdown/`, registered in `plugins.ts`, so the preview and every exporter get it at once.
3. Keep `src/export/`, `src/markdown/` and `src/edit/` free of `import 'vscode'` so they stay unit-testable; only `src/extension.ts` and `src/edit/panel.ts` (the Edit Preview webview) talk to the VS Code API.

### 3.2 Security (a Markdown file is untrusted input)

1. **Never** use `eval`, `new Function`, `vm.runIn*`, string-built `setTimeout`, or any "execute this text" mechanism.
2. **Never** assign unsanitized content to `innerHTML`/`outerHTML`/`insertAdjacentHTML`. Renderers escape user text (`escapeHtml`); exported HTML passes the export sanitizer. The only `innerHTML` uses are Mermaid's own sanitized SVG (`securityLevel: 'strict'`) and the Edit Preview's document content, which the extension renders through the export sanitizer.
3. **Never** start a process through a shell: `spawn`/`execFile` with an args array (puppeteer-core does this), never `exec` or `shell: true`.
4. Never ask users to loosen the preview's security settings, and never inject HTML into the preview outside markdown-it renderers.
5. Respect **Workspace Trust**: anything that runs code or starts external tools (e.g. PDF export's browser) is disabled in Restricted Mode.
6. PDF export loads only `file:`/`data:` resources and web images; keep the request filter in `src/export/pdf.ts`. Never pass `--no-sandbox` from the extension (tests only).
7. Configuration is **declarative JSON only**. Never add executable config/plugin files.
8. **Offline by default**: no CDN URLs, no network calls unless the user enabled a labelled opt-in feature. No telemetry.
9. Every security-relevant fix adds a case to `samples/malicious/`.
10. The Edit Preview accepts only the messages in `src/edit/messages.ts`, fully validated, and refuses edits made against an older document version. Changing that list is a security-model change (ask the owner).
11. The only CSS written into or kept from documents is `color`, `background-color` and a bounded `font-size` on `<span>` (`src/markdown/styles.ts`).

### 3.3 Preview compatibility

1. Custom block renderers must keep VS Code's scroll-sync attributes (use `sourceLineAttrs()`).
2. The preview script must survive live updates: re-render on the `vscode.markdown.updateContent` event and on theme (body class) changes, and clean up anything it adds outside its containers.
3. Plugins must work with VS Code's bundled markdown-it (v14) as well as our own copy.

### 3.4 Dependencies

1. Do not add an npm package without the owner's approval. When proposing one, state: purpose, licence, bundle size, maintenance status and alternatives. Prefer versions published at least two weeks ago.
2. Allowed licences: MIT, BSD, Apache-2.0, ISC, MS-PL, EPL-2.0 (tools only). **No GPL/AGPL/LGPL in shipped code.**
3. Versions are pinned exactly in `package.json`; commit `package-lock.json`.
4. After any dependency change run `npm run notices` and commit `THIRD_PARTY_NOTICES.md` (CI fails if it is out of date).

### 3.5 Performance

Plugins run on every keystroke in the preview: no regexes with catastrophic backtracking, no per-render file I/O, no network. Keep the VSIX small (currently ~2.3 MB); lazy-load anything heavy.

### 3.6 Scope

1. Work on the **current phase** and on the Feature IDs you were given. Do not add features, settings or commands that are not in the catalog — propose them instead.
2. Respect the **non-goals** in the feature catalog (no WYSIWYG, no linting, no image upload, no executable config).
3. v1.0 has **≤ 30 settings**. Prefer good defaults and front-matter overrides over new settings.

---

## 4. Workflow

1. **Understand** — read the Feature ID row, the relevant architecture section and existing code. Restate the goal in one or two sentences before starting.
2. **Plan** — for anything over ~1 hour or touching more than one layer, write a short plan (files, steps, tests) and share it first.
3. **Implement** in small, focused commits.
4. **Test** — add/update tests at the right level (see §6). Run the fast checks locally.
5. **Document** — update the feature catalog *Status* column, `ROADMAP.md`, the [user guide](docs/user-guide.md) (settings, commands, buttons, syntax), the README when a headline feature changes, `CHANGELOG.md` (under *Unreleased*), `docs/architecture.md` when modules change, and ADRs when a decision changes.
6. **Report** — say what was done, what was verified (with command output), and what was **not** verified. Never claim a test passed that you did not run.

### Git rules

- Integration branch: **`develop`**. `main` holds the latest release and is updated only by pull request from `develop`. Never commit directly to `main`. Feature branches: `feat/<feature-id>-<slug>` (e.g. `feat/E04-docx-export`), fixes: `fix/<slug>`.
- **Conventional Commits** with the Feature ID as scope: `feat(E04): write tables to DOCX`, `fix(A06): scroll sync drift on long tables`, `docs: …`, `test: …`, `chore: …`.
- Never force-push shared branches, rewrite published history, or delete branches without approval.
- AI agents open pull requests only when the owner asks. Outside contributors: see `CONTRIBUTING.md`.
- Never commit secrets, tokens, personal data, generated binaries, or `*.vsix` files.

---

## 5. Commands

Run from the repository root (Node.js 22 LTS):

| Purpose | Command |
|---|---|
| Install dependencies | `npm ci` |
| Build (extension + preview script + KaTeX CSS) | `npm run build` |
| Watch while developing | `npm run watch` |
| Type-check | `npm run typecheck` |
| Tests (plugins, exports, security corpus, PDF if a browser is found) | `npm test` — set `MDP_TEST_BROWSER=<path>` to force a browser |
| Refresh third-party licence notices | `npm run notices` (`-- --check` to verify) |
| Package the VSIX | `npm run package` → `markdown-previewedit-<version>.vsix` |
| Release | See [docs/releasing.md](docs/releasing.md) (tag `vX.Y.Z` → GitHub Release) |
| Debug in VS Code | Open the folder, press **F5** (Extension Development Host) |

## 6. Coding standards

### TypeScript

- `strict: true`; no `any` (use `unknown` + narrowing); no non-null assertions without a comment.
- Bundle with esbuild (`esbuild.mjs`); `@types/vscode` matches `engines.vscode`.
- Use only **stable** VS Code APIs (no proposed APIs).
- Every `Disposable` is registered in `context.subscriptions` or disposed explicitly.
- Preview script: no UI framework; keep it self-contained (it is also embedded in exported HTML).

### Naming

- Product name: **Markdown PreviewEdit** (decision D1); extension ID `adhunna.markdown-previewedit`.
- Commands: `previewEdit.<verb><Object>` (e.g. `previewEdit.openPreviewToSide`), shown under the **PreviewEdit** category; settings: `previewEdit.<area>.<name>` (e.g. `previewEdit.export.browserPath`).
- Internal CSS/DOM names keep the short `mdp-` prefix (`mdp-mermaid`, `data-mdp-theme`). They are never shown to users; do not rename them.

---

## 7. Testing rules

1. Every bug fix comes with a test that fails before the fix.
2. Every Markdown feature appears in `samples/features/all.md` and has assertions in `test/render.test.ts` (and `test/docx.test.ts` when it affects Word).
3. The malicious corpus (`test/security.test.ts`) must pass before any merge to `develop`; new security fixes add a sample.
4. Look at real output (render the feature tour to PDF/DOCX) for visual changes — passing assertions are not enough.
5. Do not skip, disable or delete tests to make a build pass. If a test is wrong, explain why and fix the test.

## 8. Definition of Done

A Feature ID is **Done** when:

- [ ] Behaviour matches the catalog row and acceptance criteria in the plan
- [ ] Built-in first (§3.1); follows the standards (§6)
- [ ] Tests added and passing (`npm run typecheck && npm test`)
- [ ] Security rules (§3.2) respected; malicious corpus passes
- [ ] Works in Restricted Mode (degrades safely)
- [ ] Docs updated: catalog *Status*, `ROADMAP.md`, user guide, CHANGELOG *Unreleased*
- [ ] No new warnings; lint and format clean

---

## 9. Ask the owner first (never decide alone)

- Adding, removing or upgrading a dependency (major versions)
- Any change to the security model, CSP, trust behaviour or message allowlist
- Renaming public commands or settings
- Adding a setting, command or feature not in the catalog
- Anything involving publishing, version bumps, signing, CI secrets or release workflows
- Deleting files or directories you did not create in the current task
- Decisions listed as open (D4–D7) in the implementation plan

## 10. Communication style

- Lead with the outcome; keep reports short and concrete.
- Separate **verified** (ran it, saw the output) from **assumed**.
- When blocked, say exactly what is blocking and what you need.
- Use the glossary terms above consistently.
