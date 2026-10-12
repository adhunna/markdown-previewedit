# MarkDownPreview

A **secure, fast, Office-friendly Markdown preview extension for VS Code**, with its core engine written in **C# / .NET 10**.

> **Status:** Planning complete — next is the **one-week MVP** ([docs/05-one-week-mvp.md](docs/05-one-week-mvp.md)). No installable build yet.

## Why another Markdown preview?

- **Everything you expect:** live preview, scroll sync, math (KaTeX/MathJax), Mermaid and other diagrams, file imports, TOC, themes.
- **Native Office export:** Word (`.docx`) export without Pandoc, using your corporate templates; PDF through the Edge/Chrome already on your PC.
- **Office → Markdown:** paste from Word, Outlook, OneNote or Excel and get clean Markdown and tables.
- **Secure by design:** works safely with repositories you didn't write (Workspace Trust, strict CSP, no executable config).
- **Offline by default, no telemetry.**

## Documentation

| Document | Contents |
|---|---|
| [docs/01-market-research.md](docs/01-market-research.md) | Competitors, 2026 trends, gaps, positioning, why C#/.NET |
| [docs/02-feature-catalog.md](docs/02-feature-catalog.md) | 128 features with IDs, priorities and phases |
| [docs/03-architecture.md](docs/03-architecture.md) | TypeScript shell + C# engine + webview design, protocol, security model, tech stack |
| [docs/04-implementation-plan.md](docs/04-implementation-plan.md) | Phases 0–5, detailed Phase 0/1 tasks, testing, CI/CD, Windows dev setup, risks, open decisions |
| [docs/05-one-week-mvp.md](docs/05-one-week-mvp.md) | One-week MVP: 29 features, day-by-day plan, shortcuts taken |
| [AGENTS.md](AGENTS.md) | Glossary and rules for AI coding agents (and humans) |

## Planned architecture (one picture)

```
VS Code ── TypeScript shell ──JSON-RPC (stdio)── C# engine (.NET 10, NativeAOT)
               │                                   └─ Markdig · Open XML SDK · HtmlSanitizer
               └── Webview preview (KaTeX · Mermaid · Shiki)
```
