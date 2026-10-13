# Security policy

A Markdown file is untrusted input: opening someone else's document must never run code, read your files or send data anywhere. We take reports that break this seriously.

## Supported versions

Markdown PreviewEdit is pre-release. Only the latest [release](https://github.com/adhunna/markdown-previewedit/releases) receives fixes.

| Version | Supported |
|---|---|
| 0.3.x (latest) | ✅ |
| 0.2.x | ❌ |
| older | ❌ |

## Reporting a vulnerability

**Please do not open a public issue.** Report privately through GitHub:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** ([direct link](https://github.com/adhunna/markdown-previewedit/security/advisories/new)).
3. Describe the problem and attach a Markdown file (or steps) that reproduces it, plus your VS Code and extension versions.

We aim to acknowledge reports within **5 working days** and to agree a fix and disclosure date with you. We credit reporters in the release notes unless you prefer otherwise.

## What counts

- Script execution or HTML injection in the preview or in exported HTML/PDF/Word files
- Reading or writing files outside what a document legitimately references
- Network requests the user did not enable
- Starting programs, or bypassing Workspace Trust / Restricted Mode
- Denial of service from a crafted document (hangs, runaway memory)

## How the extension protects you

- The preview runs inside VS Code's own sandbox (Content-Security-Policy and sanitizer); we never loosen it.
- Exported HTML is sanitized with an allowlist; scripts, frames, forms, event handlers and `javascript:` links are removed.
- Mermaid diagrams run in strict mode; no `eval` or dynamic code anywhere.
- The Edit Preview accepts only a fixed list of checked messages, edits only its own document, and refuses edits made against an older version of it. The only CSS it writes or keeps is text colour, background colour and a bounded font size.
- PDF export starts your installed browser without a shell, loads only local files, data and web images, and is disabled in Restricted Mode.
- Everything is bundled; nothing is downloaded at runtime; no telemetry.
- A corpus of hostile Markdown files ([`samples/malicious/`](samples/malicious/)) is tested on every build. Every security fix adds a new case.
