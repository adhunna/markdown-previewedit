import type MarkdownIt from 'markdown-it';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import { escapeHtml } from './util';

/**
 * A24: source map for the Edit Preview. Every rendered text character can be traced back to its
 * offset in the Markdown source, so formatting chosen in the preview can be written to the file.
 *
 * - Blocks get `data-line` / `data-line-end` (exclusive) and `data-block` (paragraph, heading, …).
 * - Text and inline code are wrapped in `<span data-src="OFFSET">`; a character written as an
 *   escape (`\*`) or entity (`&amp;`) gets its own span with `data-srclen` (its length in the source).
 *
 * Offsets are into the whole document with LF line endings. Text that cannot be traced exactly
 * is rendered without `data-src` (never with a wrong offset).
 */

/** Pass in `env` when the rendered text is a slice of the document (e.g. after front matter). */
export interface SourceMapEnv {
  mdpSourceBase?: { offset: number; line: number };
}

/** A traced piece of a text token: `length` rendered characters at source offset `src`. */
interface Run {
  start: number;
  length: number;
  src: number;
  srcLen: number;
}

const BLOCK_TYPES: Record<string, string> = {
  paragraph_open: 'paragraph',
  heading_open: 'heading',
  list_item_open: 'list_item',
  blockquote_open: 'blockquote',
  alert_open: 'alert',
  table_open: 'table',
  fence: 'code',
  code_block: 'code',
  dt_open: 'term',
  dd_open: 'definition',
  footnote_open: 'footnote',
};

const ENTITY = /^&(?:#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});/;
const ESCAPABLE = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]$/;

export function sourceMapPlugin(md: MarkdownIt): void {
  md.core.ruler.push('mdp_source_map', (state) => {
    const base = (state.env as SourceMapEnv | undefined)?.mdpSourceBase ?? { offset: 0, line: 0 };
    const lines = lineStarts(state.src);
    const lineCursor = new Map<number, number>();
    let rowMap: [number, number] | null = null;
    for (const token of state.tokens) {
      if (token.type === 'tr_open') {
        rowMap = token.map;
      }
      const type = token.type.startsWith('container_') && token.nesting === 1 ? 'container' : BLOCK_TYPES[token.type];
      if (type && token.map) {
        token.attrSet('data-line', String(token.map[0] + base.line));
        token.attrSet('data-line-end', String(token.map[1] + base.line));
        token.attrSet('data-block', type);
      }
      // Table cells have no map of their own: use the row's.
      const map = token.map ?? (token.type === 'inline' ? rowMap : null);
      if (token.type === 'inline' && map && token.children) {
        mapInline(md, state, token, map, lines, lineCursor, base.offset);
      }
    }
  });

  const text = md.renderer.rules.text;
  md.renderer.rules.text = (tokens, idx, options, env, self) => {
    const runs = (tokens[idx].meta as { mdpRuns?: Run[] } | null)?.mdpRuns;
    return runs ? renderRuns(tokens[idx].content, runs) : text ? text(tokens, idx, options, env, self) : escapeHtml(tokens[idx].content);
  };
  const code = md.renderer.rules.code_inline;
  md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const runs = (token.meta as { mdpRuns?: Run[] } | null)?.mdpRuns;
    if (!runs) {
      return code ? code(tokens, idx, options, env, self) : `<code>${escapeHtml(token.content)}</code>`;
    }
    return `<code${self.renderAttrs(token)}>${renderRuns(token.content, runs)}</code>`;
  };
}

function renderRuns(content: string, runs: Run[]): string {
  let html = '';
  let at = 0;
  for (const run of runs) {
    html += escapeHtml(content.slice(at, run.start));
    const len = run.srcLen !== run.length ? ` data-srclen="${run.srcLen}"` : '';
    html += `<span data-src="${run.src}"${len}>${escapeHtml(content.slice(run.start, run.start + run.length))}</span>`;
    at = run.start + run.length;
  }
  return html + escapeHtml(content.slice(at));
}

function lineStarts(src: string): number[] {
  const starts = [0];
  for (let i = src.indexOf('\n'); i !== -1; i = src.indexOf('\n', i + 1)) {
    starts.push(i + 1);
  }
  return starts;
}

/**
 * Finds where each line of the inline token's content sits in the source (block prefixes such as
 * `> ` or `- ` are stripped from the content), then traces each text child within the content.
 */
function mapInline(md: MarkdownIt, state: StateCore, inline: Token, map: [number, number], lines: number[], lineCursor: Map<number, number>, baseOffset: number): void {
  const [firstLine, endLine] = map;
  const contentLines = inline.content.split('\n');
  // Content line i: where it starts in the content, and where in the source (or -1 if not found).
  const contentStart: number[] = [];
  const sourceStart: number[] = [];
  let at = 0;
  let line = firstLine;
  for (const contentLine of contentLines) {
    contentStart.push(at);
    at += contentLine.length + 1;
    let found = -1;
    for (let l = line; l < endLine && l < lines.length; l++) {
      const lineEnd = l + 1 < lines.length ? lines[l + 1] - 1 : state.src.length;
      const sourceLine = state.src.slice(lines[l], lineEnd);
      const column = sourceLine.indexOf(contentLine, lineCursor.get(l) ?? 0);
      if (column !== -1) {
        found = lines[l] + column;
        lineCursor.set(l, column + contentLine.length);
        line = l + 1;
        break;
      }
    }
    sourceStart.push(found);
  }

  const toSource = (contentOffset: number, length: number): number | undefined => {
    let i = contentStart.length - 1;
    while (i > 0 && contentStart[i] > contentOffset) {
      i--;
    }
    const lineLength = contentLines[i].length;
    const column = contentOffset - contentStart[i];
    if (sourceStart[i] === -1 || column + length > lineLength) {
      return undefined;
    }
    return sourceStart[i] + column;
  };

  const content = inline.content;
  let cursor = 0;
  for (const child of inline.children ?? []) {
    switch (child.type) {
      case 'text': {
        const traced = traceText(md, child.content, content, cursor);
        if (traced) {
          cursor = traced.end;
          const runs = traced.runs
            .map((run) => ({ ...run, src: toSource(run.src, run.srcLen) }))
            .filter((run): run is Run => run.src !== undefined)
            .filter((run) => {
              const expected = child.content.slice(run.start, run.start + run.length);
              const written = state.src.slice(run.src, run.src + run.srcLen);
              return run.srcLen === run.length ? written === expected : md.utils.unescapeAll(written) === expected;
            })
            .map((run) => ({ ...run, src: run.src + baseOffset }));
          if (runs.length) {
            child.meta = { ...(child.meta as object | null), mdpRuns: runs };
          }
        }
        break;
      }
      case 'code_inline': {
        const open = content.indexOf(child.markup, cursor);
        if (open === -1) {
          break;
        }
        const traced = traceText(md, child.content, content, open + child.markup.length, true);
        cursor = traced ? traced.end + child.markup.length : open + child.markup.length;
        const src = traced && traced.runs.length === 1 && traced.runs[0].length === child.content.length ? toSource(traced.runs[0].src, child.content.length) : undefined;
        if (src !== undefined && state.src.slice(src, src + child.content.length) === child.content) {
          child.meta = { ...(child.meta as object | null), mdpRuns: [{ start: 0, length: child.content.length, src: src + baseOffset, srcLen: child.content.length }] };
        }
        break;
      }
      case 'html_inline':
      case 'math_inline': {
        const found = content.indexOf(child.content, cursor);
        cursor = found === -1 ? cursor : found + child.content.length;
        break;
      }
      case 'emoji': {
        const found = content.indexOf(`:${child.markup}:`, cursor);
        cursor = found === -1 ? cursor : found + child.markup.length + 2;
        break;
      }
      case 'footnote_ref': {
        const label = (child.meta as { label?: string } | null)?.label;
        const found = label === undefined ? -1 : content.indexOf(`[^${label}]`, cursor);
        cursor = found === -1 ? cursor : found + label!.length + 3; // label is defined when found !== -1
        break;
      }
      case 'mdp_task': {
        const found = content.indexOf(']', cursor);
        cursor = found === -1 ? cursor : found + 1;
        break;
      }
      case 'image':
        cursor = skipLinkTarget(content, skipBrackets(content, content.indexOf('![', cursor) + 1));
        break;
      case 'link_close':
        if (child.markup === 'autolink') {
          const found = content.indexOf('>', cursor);
          cursor = found === -1 ? cursor : found + 1;
        } else if (child.markup !== 'linkify') {
          const close = content.indexOf(']', cursor);
          cursor = close === -1 ? cursor : skipLinkTarget(content, close + 1);
        }
        break;
      default:
        break;
    }
  }
}

/** From `[` at `open`, returns the index after the matching `]` (or `open + 1` if none). */
function skipBrackets(content: string, open: number): number {
  if (open < 0 || content[open] !== '[') {
    return Math.max(open, 0);
  }
  let depth = 0;
  for (let i = open; i < content.length; i++) {
    if (content[i] === '\\') {
      i++;
    } else if (content[i] === '[') {
      depth++;
    } else if (content[i] === ']' && --depth === 0) {
      return i + 1;
    }
  }
  return open + 1;
}

/** Skips a `(url "title")` or `[ref]` that follows link text; returns the index after it. */
function skipLinkTarget(content: string, at: number): number {
  if (content[at] === '[') {
    return skipBrackets(content, at);
  }
  if (content[at] !== '(') {
    return at;
  }
  let depth = 0;
  for (let i = at; i < content.length; i++) {
    if (content[i] === '\\') {
      i++;
    } else if (content[i] === '(') {
      depth++;
    } else if (content[i] === ')' && --depth === 0) {
      return i + 1;
    }
  }
  return at;
}

/**
 * Traces `text` (a token's rendered characters) inside `content` from `from`: the first character
 * may be preceded by markup (searched for); after that every character must follow directly,
 * written as itself, as a backslash escape or as an HTML entity.
 */
function traceText(md: MarkdownIt, text: string, content: string, from: number, exact = false): { runs: Run[]; end: number } | undefined {
  if (!text) {
    return undefined;
  }
  // Exact mode: the text starts right at `from`. Otherwise try each later position in turn.
  const last = exact ? from : content.length - 1;
  for (let start = from; start <= last; start++) {
    if (matchAt(md, text, 0, content, start, exact)) {
      const traced = traceFrom(md, text, content, start, exact);
      if (traced) {
        return traced;
      }
    }
  }
  return undefined;
}

function traceFrom(md: MarkdownIt, text: string, content: string, start: number, exact: boolean): { runs: Run[]; end: number } | undefined {
  const runs: Run[] = [];
  let p = start;
  let i = 0;
  while (i < text.length) {
    const m = matchAt(md, text, i, content, p, exact);
    if (!m) {
      return undefined;
    }
    const prev = runs[runs.length - 1];
    if (m.srcLen === 1 && m.length === 1 && prev && prev.srcLen === prev.length && prev.src + prev.srcLen === p) {
      prev.length++;
      prev.srcLen++;
    } else {
      runs.push({ start: i, length: m.length, src: p, srcLen: m.srcLen });
    }
    i += m.length;
    p += m.srcLen;
  }
  return { runs, end: p };
}

function matchAt(md: MarkdownIt, text: string, i: number, content: string, p: number, exact = false): { length: number; srcLen: number } | undefined {
  const ch = text[i];
  const c = content[p];
  if (c === undefined) {
    return undefined;
  }
  if (!exact) {
    // Escapes and entities first: "\*" is one "*", "&amp;" is one "&".
    if (c === '\\' && content[p + 1] === ch && ESCAPABLE.test(ch)) {
      return { length: 1, srcLen: 2 };
    }
    if (c === '&') {
      const entity = ENTITY.exec(content.slice(p, p + 40));
      if (entity) {
        const decoded = md.utils.unescapeAll(entity[0]);
        if (decoded !== entity[0] && text.startsWith(decoded, i)) {
          return { length: decoded.length, srcLen: entity[0].length };
        }
      }
    }
  }
  if (c === ch || (exact && ch === ' ' && c === '\n')) {
    return { length: 1, srcLen: 1 };
  }
  return undefined;
}
