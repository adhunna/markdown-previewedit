import { pathToFileURL } from 'node:url';
import { createExportMarkdownIt, firstHeading, parseFrontMatter } from './engine';

/** Static files the exported page embeds (read from the extension folder by the caller). */
export interface ExportAssets {
  readonly exportCss: string;
  readonly previewCss: string;
  /** KaTeX stylesheet with fonts inlined as data URIs (built by esbuild.mjs). */
  readonly katexCss: string;
  /** The bundled Mermaid renderer (dist/preview/mermaid.js). */
  readonly mermaidJs: string;
}

export interface HtmlExportOptions {
  readonly mermaid: boolean;
  /** Folder of the source file: relative images and links resolve against it. */
  readonly baseDir?: string;
}

export interface HtmlExportResult {
  readonly html: string;
  readonly title: string;
  readonly hasMermaid: boolean;
}

/** Renders a Markdown document to one self-contained HTML page (works offline). */
export function renderHtmlDocument(markdown: string, assets: ExportAssets, options: HtmlExportOptions): HtmlExportResult {
  const { title: frontMatterTitle, body } = parseFrontMatter(markdown);
  const md = createExportMarkdownIt({ mermaid: options.mermaid });
  const content = md.render(body);
  const title = frontMatterTitle ?? firstHeading(body) ?? 'Document';
  const hasMath = content.includes('class="katex');
  const hasMermaid = content.includes('class="mdp-mermaid');
  const base = options.baseDir ? `<base href="${escapeAttr(pathToFileURL(options.baseDir + '/').href)}">\n` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="MarkDownPreview">
<title>${md.utils.escapeHtml(title)}</title>
${base}<style>
${assets.exportCss}
${assets.previewCss}
${hasMath ? assets.katexCss : ''}
</style>
</head>
<body class="mdp-export">
<main class="markdown-body">
${content}
</main>
${hasMermaid ? `<script>\n${assets.mermaidJs.replace(/<\/script/gi, '<\\/script')}\n</script>` : ''}
</body>
</html>
`;
  return { html, title, hasMermaid };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
