import katex from '@vscode/markdown-it-katex';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { extendMarkdownIt } from '../markdown/plugins';
import { formatStyle, parseSafeStyle, SAFE_COLOR, SAFE_FONT_SIZE, STYLED_SPAN_OPEN } from '../markdown/styles';

const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif|bmp);/i;

/**
 * Raw HTML allowed in exported documents. Scripts, `<style>`, frames, forms and event handlers never
 * pass; the only CSS kept is colour, background colour and font size on `<span>` (styles.ts).
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img', 'details', 'summary', 'kbd', 'mark', 'ins', 'del', 'sub', 'sup', 'picture', 'source', 'u', 's',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['id', 'title', 'align', 'lang', 'dir'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    source: ['srcset', 'media', 'type'],
    details: ['open'],
    span: ['style'],
    td: ['colspan', 'rowspan', 'align'],
    th: ['colspan', 'rowspan', 'align'],
  },
  allowedStyles: { span: { color: [SAFE_COLOR], 'background-color': [SAFE_COLOR], 'font-size': [SAFE_FONT_SIZE] } },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  transformTags: {
    // Keep only safe declarations, with sizes range-checked; drop the attribute if none are left.
    span: (tagName, attribs) => {
      const { style, ...rest } = attribs;
      const css = style === undefined ? '' : formatStyle(parseSafeStyle(style));
      return { tagName, attribs: css ? { ...rest, style: css } : rest };
    },
    // Inline images may only be real image data, never data:text/html and the like.
    img: (tagName, attribs) => {
      const { src, ...rest } = attribs;
      return { tagName, attribs: src && /^data:/i.test(src.trim()) && !SAFE_DATA_IMAGE.test(src.trim()) ? rest : attribs };
    },
  },
};

/** Inline HTML tags (`<kbd>`, `</sub>`, `<br>` …) allowed without attributes; anything else is shown as text. */
const SAFE_INLINE_TAG = /^<\/?(kbd|sub|sup|br|b|i|em|strong|mark|small|u|s|del|ins|abbr|span|code)\s*\/?>$/i;

export interface ParsedDocument {
  readonly title: string | undefined;
  readonly body: string;
}

/** Splits off YAML front matter and reads a `title:` from it (no YAML evaluation). */
export function parseFrontMatter(markdown: string): ParsedDocument {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(markdown);
  if (!match) {
    return { title: undefined, body: markdown };
  }
  const titleLine = /^title:[ \t]*(.+)$/m.exec(match[1]);
  const title = titleLine?.[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  return { title: title || undefined, body: markdown.slice(match[0].length) };
}

/** The markdown-it instance used for HTML and PDF export: same syntax as the preview, plus sanitizing. */
export function createExportMarkdownIt(options: { mermaid: boolean }): MarkdownIt {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
  md.use(katex, { enableFencedBlocks: true });
  extendMarkdownIt(md, { isMermaidEnabled: () => options.mermaid, addHeadingIds: true });

  md.renderer.rules.html_block = (tokens, idx) => sanitizeHtml(tokens[idx].content, SANITIZE_OPTIONS);
  md.renderer.rules.html_inline = (tokens, idx) => {
    const content = tokens[idx].content;
    if (SAFE_INLINE_TAG.test(content.trim())) {
      return content;
    }
    const styled = STYLED_SPAN_OPEN.exec(content.trim());
    if (styled) {
      const css = formatStyle(parseSafeStyle(styled[1] ?? styled[2] ?? ''));
      return css ? `<span style="${md.utils.escapeHtml(css)}">` : '<span>';
    }
    if (/^<!--[\s\S]*-->$/.test(content.trim())) {
      return '';
    }
    return md.utils.escapeHtml(content);
  };
  return md;
}

export function firstHeading(markdown: string): string | undefined {
  return /^#\s+(.+?)\s*#*\s*$/m.exec(markdown)?.[1];
}
