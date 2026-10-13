# Contributing to Markdown PreviewEdit

Thanks for helping! Bug reports, ideas, documentation fixes and code are all welcome.

By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are accepted under the project's [MIT licence](LICENSE).

## Ways to help

- **Report a bug:** [open an issue](https://github.com/adhunna/markdown-previewedit/issues/new/choose) with the *Bug report* form. Attach a small Markdown file that shows the problem.
- **Suggest a feature:** check the [roadmap](ROADMAP.md) first. If the feature is listed, comment on or open an issue that names its **Feature ID** (for example `E05`). New ideas are welcome too.
- **Report a security problem:** do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).
- **Write code or docs:** see below.

## Before you write code

1. Find or open an issue and say you'd like to work on it, so nobody duplicates the work.
2. For anything bigger than a small fix, describe your plan in the issue first (files, approach, tests). New dependencies, settings and commands need a maintainer's agreement before you start.
3. Read the [architecture guide](docs/architecture.md) to find your way around the code, and [AGENTS.md](AGENTS.md). Despite the name, it is the rulebook for every contributor, human or AI: the golden rules (built-in first, security, dependencies, scope), the coding standards and the definition of done.

## Development setup

You need [Node.js 22 LTS](https://nodejs.org/), [Git](https://git-scm.com/) and [VS Code](https://code.visualstudio.com/). Microsoft Edge or Google Chrome is needed only for the PDF test.

```powershell
git clone https://github.com/adhunna/markdown-previewedit.git
cd markdown-previewedit
npm ci
code .
```

Press **F5** to open an *Extension Development Host* window with your build loaded. Open `samples/features/all.md` there and click the preview button.

| Task | Command |
|---|---|
| Build | `npm run build` |
| Rebuild on change | `npm run watch` |
| Type-check | `npm run typecheck` |
| Tests (plugins, exports, security corpus, PDF if Edge/Chrome is found) | `npm test` |
| Refresh the third-party licence notices (after dependency changes) | `npm run notices` |
| Build the `.vsix` | `npm run package` |

## Project layout

| Path | Contents |
|---|---|
| `src/extension.ts` | Entry point: commands, buttons, settings, export flow |
| `src/markdown/` | markdown-it plugins used by the previews **and** every export |
| `src/preview/` | Script that runs inside VS Code's preview (Mermaid, preview theme) |
| `src/edit/` | The Edit Preview: renderer, formatting engine, message validation, webview panel and toolbar |
| `src/export/` | HTML, PDF and Word exporters and the export sanitizer |
| `media/` | Stylesheets and the extension icon |
| `samples/features/all.md` | Feature tour: one document using every supported syntax |
| `samples/malicious/` | Hostile Markdown the security tests run against |
| `test/` | Unit, export, security and browser tests (`node:test`) |
| `docs/` | User guide, architecture, releasing, decisions (ADRs), feature catalog and project history; see [docs/README.md](docs/README.md) |

The [architecture guide](docs/architecture.md) explains how these fit together.

## Pull requests

1. Fork the repository and branch from **`develop`** (`main` only holds released versions): `feat/<feature-id>-<short-name>` or `fix/<short-name>`.
2. Keep each pull request to one feature or fix.
3. Write [Conventional Commits](https://www.conventionalcommits.org/) with the Feature ID as the scope, for example `feat(E05): apply styles from a reference .docx`.
4. Add or update tests. A bug fix needs a test that fails without the fix. A new syntax goes into `samples/features/all.md` and `test/render.test.ts`. A security fix adds a file to `samples/malicious/`.
5. Update the docs: the *Status* column in `docs/02-feature-catalog.md`, [ROADMAP.md](ROADMAP.md), the [user guide](docs/user-guide.md) if users see the change, and [CHANGELOG.md](CHANGELOG.md) under *Unreleased*.
6. Run `npm run typecheck`, `npm test` and `npm run package` before you push. CI runs the same checks.
7. Open the pull request against `develop` and fill in the template.

For visual changes (preview look, PDF, Word), include a screenshot. Passing tests alone are not enough.

## Releases

Maintainers publish versions as described in [docs/releasing.md](docs/releasing.md).

## Questions

Use GitHub Discussions if they are turned on for the repository; otherwise open a *Feature request* and describe what you are trying to do.
