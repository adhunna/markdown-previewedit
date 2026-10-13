# Releasing

How a new version of Markdown PreviewEdit is published. Only maintainers do this.

Every version is published as a **GitHub Release** with the `.vsix` attached (automated), and then uploaded by hand to the **VS Code Marketplace** (and optionally **Open VSX**). See [Publish to the Marketplace](#publish-to-the-vs-code-marketplace) below.

## Steps

1. **Prepare on `develop`.** All changes for the release are merged, and CI is green.
2. **Choose the version** following [Semantic Versioning](https://semver.org/). Below 1.0, new features raise the minor version (0.3.0 → 0.4.0) and fixes raise the patch version (0.3.0 → 0.3.1).
3. **Update the version and notes** in one commit:
   - `package.json` and `package-lock.json`: `npm version 0.4.0 --no-git-tag-version`
   - `CHANGELOG.md`: rename `## [Unreleased]` to `## [0.4.0] - YYYY-MM-DD`, add a new empty `## [Unreleased]` above it, and update the links at the bottom.
   - Commit: `chore(release): 0.4.0`
4. **Check locally:**

   ```powershell
   npm ci
   npm run typecheck
   npm run notices -- --check
   npm test
   npm run package    # → markdown-previewedit-0.4.0.vsix; install it and try it
   ```

5. **Tag and push** (or use the alternative below):

   ```powershell
   git tag -a v0.4.0 -m "Markdown PreviewEdit 0.4.0"
   git push origin develop v0.4.0
   ```

   The tag must match the `package.json` version, or the workflow stops.

   **Alternative without pushing a tag:** merge the release commit into `main`. Then, on GitHub, open **Actions → Release → Run workflow**, choose `main` and run it. The workflow creates the `vX.Y.Z` tag on that commit itself.
6. **The [Release workflow](../.github/workflows/release.yml) does the rest.** It runs the checks again, builds the `.vsix`, and creates a GitHub Release whose notes are that version's section of `CHANGELOG.md`, with the `.vsix` attached. While the version is below 1.0, the release is marked as a *pre-release*.
7. **Merge `develop` into `main`** with a pull request, so `main` always holds the latest release.

## Publish to the VS Code Marketplace

The extension is uploaded by hand through the Marketplace website. This needs no access tokens: Microsoft retires the global Azure DevOps tokens that `vsce publish` used on **1 December 2026**, and automated publishing after that needs Microsoft Entra ID (a managed identity). See Microsoft's [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

**Once:** create the publisher.

1. Go to <https://marketplace.visualstudio.com/manage> and sign in with your Microsoft account.
2. Choose **Create publisher**. Set **ID** `adhunna`; it must match `"publisher"` in `package.json` and cannot be changed later. The **Name** is what users see.

**Every version:**

1. Download `markdown-previewedit-X.Y.Z.vsix` from the GitHub Release.
2. First time: on the publisher page choose **+ New extension → Visual Studio Code** and upload the file. Later versions: open the extension's **⋯ (More actions) → Update** and upload the new file.
3. Wait for the status to change from *Verifying* to the version number (usually a few minutes). Then check the public page: README, icon and screenshots.
4. In VS Code, search the Extensions view for **Markdown PreviewEdit** to confirm the new version is offered.

Rules the Marketplace enforces (the build already follows them): the version must be higher than any uploaded before; only `major.minor.patch` (no `-beta`); no SVG icon; images in README/CHANGELOG must be `https` (relative links are rewritten to GitHub, so the repository must be public).

`"preview": true` in `package.json` shows a **Preview** badge on the Marketplace. Remove it for 1.0.

**Open VSX (optional, for Cursor, Windsurf and VSCodium users):** sign in at <https://open-vsx.org> with GitHub, accept the publisher agreement, create the `adhunna` namespace, and publish the same `.vsix` from the website.

## If something goes wrong

- **The workflow failed before creating the release:** fix the problem on `develop`, delete the tag (`git push origin :refs/tags/v0.4.0` and `git tag -d v0.4.0`), then tag again.
- **A bad release is already out:** do not reuse the version number. Publish a fixed `0.4.1` and mention the problem in its notes. On the Marketplace you can also remove a single version (**More actions → Reports → Version history**) or unpublish the extension temporarily.
