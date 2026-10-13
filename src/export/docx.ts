import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ParagraphChild,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import type Token from 'markdown-it/lib/token.mjs';
import { firstHeading, parseFrontMatter } from './engine';
import { extendMarkdownIt } from '../markdown/plugins';
import { cssColorToHex, cssSizeToHalfPoints, parseSafeStyle, STYLED_SPAN_OPEN } from '../markdown/styles';
import type { TocHeading } from '../markdown/toc';

/*
 * Native Word export ("DOCX-lite", feature E04): headings, paragraphs, emphasis, highlight,
 * sub/superscript, inline code, links, bullet/numbered/task lists, tables, code blocks, block
 * quotes, GitHub alerts, ::: containers, definition lists, footnotes, emoji, `[TOC]`.
 * Images, diagrams and equations are written as clearly marked placeholders for now.
 */

const HEADINGS: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
};

const CODE_FONT = 'Consolas';
const BULLETS = 'mdp-bullets';
const NUMBERS = 'mdp-numbers';
const INDENT_PER_LEVEL = 720; // twentieths of a point = 0.5 inch

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  code?: boolean;
  highlight?: boolean;
  underline?: boolean;
  superScript?: boolean;
  subScript?: boolean;
  /** From `<span style="…">` (A24): text colour and fill as RRGGBB, size in half-points. */
  color?: string;
  fill?: string;
  size?: number;
}

/** The on/off parts of a run style (Markdown emphasis and friends). */
type ToggleKey = 'bold' | 'italics' | 'strike' | 'code' | 'highlight' | 'underline' | 'superScript' | 'subScript';

interface ListContext {
  readonly ordered: boolean;
  readonly instance: number;
}

export interface DocxExportOptions {
  readonly author?: string;
}

/** Builds a .docx file (as bytes) from Markdown text. */
export async function renderDocx(markdown: string, options: DocxExportOptions = {}): Promise<Uint8Array> {
  const { title: frontMatterTitle, body } = parseFrontMatter(markdown);
  // Raw HTML is parsed so <span style> colours carry over; other tags are dropped, their text kept.
  const md = new MarkdownIt({ html: true, linkify: true });
  // Same syntax as the preview; Mermaid stays a code fence and becomes a placeholder below.
  extendMarkdownIt(md, { isMermaidEnabled: () => false, addHeadingIds: false });
  const tokens = md.parse(body, {});
  const writer = new DocxWriter();
  const children = writer.blocks(tokens);
  const title = frontMatterTitle ?? firstHeading(body) ?? 'Document';

  const doc = new Document({
    creator: options.author ?? 'Markdown PreviewEdit',
    title,
    styles: {
      paragraphStyles: [
        {
          id: 'MdpCode',
          name: 'Code Block',
          basedOn: 'Normal',
          quickFormat: true,
          run: { font: CODE_FONT, size: 19 },
          paragraph: {
            spacing: { before: 0, after: 0, line: 240 },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F3F3' },
          },
        },
        {
          id: 'MdpQuote',
          name: 'Block Quote',
          basedOn: 'Normal',
          quickFormat: true,
          run: { italics: true, color: '555555' },
          paragraph: {
            indent: { left: INDENT_PER_LEVEL },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'BBBBBB', space: 8 } },
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: ['•', '◦', '▪'][level % 3],
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: INDENT_PER_LEVEL * (level + 1), hanging: 360 } } },
          })),
        },
        {
          reference: NUMBERS,
          levels: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => ({
            level,
            format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][level % 3],
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: INDENT_PER_LEVEL * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

class DocxWriter {
  private readonly lists: ListContext[] = [];
  private nextListInstance = 1;
  private quoteDepth = 0;
  private definitionDepth = 0;
  private firstParagraphInItem = false;
  private footnotePrefix: string | undefined;

  blocks(tokens: Token[]): (Paragraph | Table)[] {
    const out: (Paragraph | Table)[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      switch (token.type) {
        case 'heading_open':
          out.push(new Paragraph({ heading: HEADINGS[token.tag], children: this.inline(tokens[i + 1]) }));
          i += 2;
          break;
        case 'paragraph_open':
          out.push(this.paragraph(tokens[i + 1]));
          i += 2;
          break;
        case 'bullet_list_open':
        case 'ordered_list_open':
          this.lists.push({ ordered: token.type === 'ordered_list_open', instance: this.nextListInstance++ });
          break;
        case 'bullet_list_close':
        case 'ordered_list_close':
          this.lists.pop();
          break;
        case 'list_item_open':
          this.firstParagraphInItem = true;
          break;
        case 'blockquote_open':
          this.quoteDepth++;
          break;
        case 'blockquote_close':
        case 'alert_close':
          this.quoteDepth--;
          break;
        case 'alert_open': {
          this.quoteDepth++;
          const { title } = token.meta as { title: string };
          out.push(new Paragraph({ style: 'MdpQuote', children: [new TextRun({ text: title, bold: true, italics: false })] }));
          break;
        }
        case 'fence':
        case 'code_block':
          out.push(...this.code(token));
          break;
        case 'table_open': {
          const end = tokens.findIndex((t, j) => j > i && t.type === 'table_close');
          out.push(this.table(tokens.slice(i, end + 1)));
          i = end;
          break;
        }
        case 'dt_open':
          out.push(new Paragraph({ children: this.inline(tokens[i + 1], { bold: true }) }));
          i += 2;
          break;
        case 'dd_open':
          this.definitionDepth++;
          break;
        case 'dd_close':
          this.definitionDepth--;
          break;
        case 'footnote_block_open':
          out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 1 } } }));
          break;
        case 'footnote_open':
          this.footnotePrefix = `[${(token.meta as { id: number }).id + 1}] `;
          break;
        case 'hr':
          out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 1 } } }));
          break;
        case 'html_block': {
          // Visible text only: tags, comments and scripts are removed.
          const text = sanitizeHtml(token.content, { allowedTags: [], allowedAttributes: {}, nonTextTags: ['script', 'style', 'textarea', 'noscript', 'title'] })
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
          for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
            out.push(new Paragraph({ children: [new TextRun(line)] }));
          }
          break;
        }
        case 'mdp_toc':
          out.push(...this.toc((token.meta as { headings: TocHeading[] }).headings));
          break;
        default: {
          // ::: note/tip/info/warning/danger/details boxes are written like block quotes.
          const container = /^container_(\w+)_(open|close)$/.exec(token.type);
          if (container?.[2] === 'open') {
            this.quoteDepth++;
            const title = token.info.trim().slice(container[1].length).trim() || capitalize(container[1]);
            out.push(new Paragraph({ style: 'MdpQuote', children: [new TextRun({ text: title, bold: true, italics: false })] }));
          } else if (container?.[2] === 'close') {
            this.quoteDepth--;
          }
          // Other tokens are not exported in DOCX-lite.
          break;
        }
      }
    }
    return out;
  }

  private paragraph(inlineToken: Token): Paragraph {
    const children = this.inline(inlineToken);
    if (this.footnotePrefix) {
      children.unshift(new TextRun({ text: this.footnotePrefix, superScript: true }));
      this.footnotePrefix = undefined;
    }
    if (this.definitionDepth > 0) {
      return new Paragraph({ children, indent: { left: INDENT_PER_LEVEL * this.definitionDepth } });
    }
    if (this.lists.length > 0) {
      const list = this.lists[this.lists.length - 1];
      const level = this.lists.length - 1;
      if (this.firstParagraphInItem) {
        this.firstParagraphInItem = false;
        return new Paragraph({
          children,
          numbering: { reference: list.ordered ? NUMBERS : BULLETS, level, instance: list.instance },
        });
      }
      return new Paragraph({ children, indent: { left: INDENT_PER_LEVEL * (level + 1) } });
    }
    if (this.quoteDepth > 0) {
      return new Paragraph({ children, style: 'MdpQuote', indent: { left: INDENT_PER_LEVEL * this.quoteDepth } });
    }
    return new Paragraph({ children });
  }

  private code(token: Token): Paragraph[] {
    const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase();
    if (lang === 'mermaid') {
      return [placeholder('Mermaid diagram — open the Markdown preview or export to PDF/HTML to see it.')];
    }
    if (lang === 'math') {
      return [new Paragraph({ children: [new TextRun({ text: token.content.trim(), font: 'Cambria Math' })] })];
    }
    const lines = token.content.replace(/\n$/, '').split('\n');
    return lines.map((line) => new Paragraph({ style: 'MdpCode', children: [new TextRun({ text: line.replace(/\t/g, '    ') || ' ' })] }));
  }

  private table(tokens: Token[]): Table {
    const rows: { cells: { inline: Token; header: boolean; align: string | null }[] }[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === 'tr_open') {
        rows.push({ cells: [] });
      } else if (token.type === 'th_open' || token.type === 'td_open') {
        const style = token.attrGet('style') ?? '';
        const align = /text-align:\s*(left|center|right)/.exec(style)?.[1] ?? null;
        rows[rows.length - 1].cells.push({ inline: tokens[i + 1], header: token.type === 'th_open', align });
      }
    }
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      rows: rows.map(
        (row) =>
          new TableRow({
            tableHeader: row.cells.some((c) => c.header),
            children: row.cells.map(
              (cell) =>
                new TableCell({
                  shading: cell.header ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' } : undefined,
                  children: [
                    new Paragraph({
                      alignment: cell.align === 'center' ? AlignmentType.CENTER : cell.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
                      children: this.inline(cell.inline, { bold: cell.header }),
                    }),
                  ],
                }),
            ),
          }),
      ),
    });
  }

  private toc(headings: TocHeading[]): Paragraph[] {
    if (headings.length === 0) {
      return [];
    }
    const minLevel = Math.min(...headings.map((h) => h.level));
    return [
      new Paragraph({ children: [new TextRun({ text: 'Contents', bold: true })] }),
      ...headings.map((h) => new Paragraph({ indent: { left: INDENT_PER_LEVEL * (h.level - minLevel) }, children: [new TextRun(h.text)] })),
    ];
  }

  /** Converts an inline token's children into Word runs and hyperlinks. */
  private inline(token: Token | undefined, base: RunStyle = {}): ParagraphChild[] {
    const out: ParagraphChild[] = [];
    const style: RunStyle = { ...base };
    let link: { href: string; runs: TextRun[] } | undefined;
    const children = token?.children ?? [];

    // Open `<span>` tags; styled ones carry colour/fill/size for the runs inside them.
    const spans: Partial<RunStyle>[] = [];

    const emit = (text: string, extra: Partial<RunStyle> = {}, isBreak = false) => {
      const s: RunStyle = Object.assign({}, style, ...spans, extra);
      const run = new TextRun({
        text,
        bold: s.bold,
        italics: s.italics,
        strike: s.strike,
        highlight: s.highlight ? 'yellow' : undefined,
        underline: s.underline ? {} : undefined,
        superScript: s.superScript,
        subScript: s.subScript,
        font: s.code ? CODE_FONT : undefined,
        color: s.color,
        size: s.size,
        shading: s.code ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F3F3' } : s.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: s.fill } : undefined,
        style: link ? 'Hyperlink' : undefined,
        break: isBreak ? 1 : undefined,
      });
      if (link) {
        link.runs.push(run);
      } else {
        out.push(run);
      }
    };

    const toggles: Record<string, ToggleKey> = {
      strong: 'bold',
      em: 'italics',
      s: 'strike',
      mark: 'highlight',
      ins: 'underline',
      sup: 'superScript',
      sub: 'subScript',
    };

    for (const child of children) {
      const toggle = /^(\w+)_(open|close)$/.exec(child.type);
      if (toggle && toggles[toggle[1]]) {
        const key = toggles[toggle[1]];
        style[key] = toggle[2] === 'open' ? true : base[key];
        continue;
      }
      switch (child.type) {
        case 'text':
        case 'emoji':
          emit(child.content);
          break;
        case 'mdp_task':
          emit((child.meta as { checked: boolean }).checked ? '☑ ' : '☐ ');
          break;
        case 'footnote_ref':
          emit(`[${(child.meta as { id: number }).id + 1}]`, { superScript: true });
          break;
        case 'footnote_anchor':
          break;
        case 'code_inline':
          emit(child.content, { code: true });
          break;
        case 'softbreak':
          emit(' ');
          break;
        case 'hardbreak':
          emit('', {}, true);
          break;
        case 'link_open': {
          const href = child.attrGet('href') ?? '';
          if (/^(https?:|mailto:)/i.test(href)) {
            link = { href, runs: [] };
          }
          break;
        }
        case 'link_close':
          if (link) {
            out.push(new ExternalHyperlink({ link: link.href, children: link.runs }));
            link = undefined;
          }
          break;
        case 'image':
          emit(`[Image: ${child.content || child.attrGet('src') || ''}]`, { italics: true });
          break;
        case 'html_inline': {
          const tag = child.content.trim();
          const styled = STYLED_SPAN_OPEN.exec(tag);
          if (styled) {
            const css = parseSafeStyle(styled[1] ?? styled[2] ?? '');
            const color = css.get('color');
            const fill = css.get('background-color');
            const size = css.get('font-size');
            spans.push({
              color: color ? cssColorToHex(color) : undefined,
              fill: fill ? cssColorToHex(fill) : undefined,
              size: size ? cssSizeToHalfPoints(size) : undefined,
            });
          } else if (/^<span\s*>$/i.test(tag)) {
            spans.push({});
          } else if (/^<\/span\s*>$/i.test(tag)) {
            spans.pop();
          }
          break;
        }
        default:
          if (child.content) {
            emit(child.content);
          }
          break;
      }
    }
    return out;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function placeholder(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: `[${text}]`, italics: true, color: '777777' })] });
}
