# Releasing

How a new version of MarkDownPreview is published. Only maintainers do this.

Releases are **GitHub Releases** with the `.vsix` attached. Publishing to the VS Code Marketplace and Open VSX comes later: the product name and publisher ID are still open decision D1 in the [implementation plan](04-implementation-plan.md#9-decisions-owner-to-confirm--recommended-default-in-bold).

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
   npm run package    # → markdownpreview-0.4.0.vsix; install it and try it
   ```

5. **Tag and push:**

   ```powershell
   git tag -a v0.4.0 -m "MarkDownPreview 0.4.0"
   git push origin develop v0.4.0
   ```

   The tag must match the `package.json` version, or the workflow stops.
6. **The [Release workflow](../.github/workflows/release.yml) does the rest.** It runs the checks again, builds the `.vsix`, and creates a GitHub Release whose notes are that version's section of `CHANGELOG.md`, with the `.vsix` attached. While the version is below 1.0, the release is marked as a *pre-release*.
7. **Merge `develop` into `main`** with a pull request, so `main` always holds the latest release.

## If something goes wrong

- **The workflow failed before creating the release:** fix the problem on `develop`, delete the tag (`git push origin :refs/tags/v0.4.0` and `git tag -d v0.4.0`), then tag again.
- **A bad release is already out:** do not reuse the version number. Publish a fixed `0.4.1` and mention the problem in its notes.
