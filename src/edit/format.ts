import { formatStyle, parseSafeStyle, type StyleProperty } from '../markdown/styles';

/**
 * A24: turns a formatting choice made in the Edit Preview into text edits on the Markdown source.
 * Pure (no VS Code API). All offsets and line numbers refer to the document with LF line endings.
 */

export type InlineMark = 'bold' | 'italic' | 'strike' | 'code' | 'highlight' | 'underline' | 'sub' | 'sup';
export type CaseMode = 'upper' | 'lower' | 'title' | 'sentence';
export type ListKind = 'bullet' | 'numbered' | 'task';
export type AlertType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

export const INLINE_MARKS: readonly InlineMark[] = ['bold', 'italic', 'strike', 'code', 'highlight', 'underline', 'sub', 'sup'];
export const CASE_MODES: readonly CaseMode[] = ['upper', 'lower', 'title', 'sentence'];
export const LIST_KINDS: readonly ListKind[] = ['bullet', 'numbered', 'task'];
export const ALERT_TYPES: readonly AlertType[] = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];

export type FormatAction =
  | { kind: 'mark'; mark: InlineMark }
  | { kind: 'link'; url: string } // '' removes the link
  | { kind: 'style'; property: StyleProperty; value: string | null } // null removes the property
  | { kind: 'case'; mode: CaseMode }
  | { kind: 'clear' }
  | { kind: 'heading'; level: number } // 0 = normal paragraph
  | { kind: 'list'; list: ListKind }
  | { kind: 'quote' }
  | { kind: 'alert'; alert: AlertType };

/** Source range of selected text (`end` exclusive). */
export interface Span {
  start: number;
  end: number;
}

/** A block (paragraph, heading …) touched by the selection: lines `[start, end)`. */
export interface BlockLines {
  start: number;
  end: number;
  type: string;
}

export interface FormatRequest {
  action: FormatAction;
  /** Selected text, one group per block, in document order. */
  groups: Span[][];
  /** When the selection is inside an element that already has this format: that element's text range. */
  active?: Span;
  /** Innermost paragraph/heading/list-item blocks touched by the selection. */
  blocks: BlockLines[];
  /** First line of the GitHub alert containing the selection, if any. */
  alertLine?: number;
}

export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

export interface FormatResult {
  edits: TextEdit[];
  /** Where the formatted text is after the edits, to re-select it in the preview. */
  select?: Span;
  /** Shown to the user when nothing could be changed. */
  message?: string;
}

const MARKERS: Record<Exclude<InlineMark, 'code'>, { insert: string; variants: string[] }> = {
  bold: { insert: '**', variants: ['**', '__'] },
  italic: { insert: '*', variants: ['*', '_'] },
  strike: { insert: '~~', variants: ['~~'] },
  highlight: { insert: '==', variants: ['=='] },
  underline: { insert: '++', variants: ['++'] },
  sub: { insert: '~', variants: ['~'] },
  sup: { insert: '^', variants: ['^'] },
};

const SPAN_BEFORE = /<span\s+style\s*=\s*"([^"<>]*)"\s*>$/i;
const SPAN_CLOSE = '</span>';

export function applyFormat(source: string, request: FormatRequest): FormatResult {
  const action = request.action;
  switch (action.kind) {
    case 'mark':
      return request.active ? unwrapMark(source, request.active, action.mark) : wrapMark(source, groupsOf(source, request), action.mark);
    case 'link':
      return link(source, request, action.url);
    case 'style':
      return style(source, request, action.property, action.value);
    case 'case':
      return changeCase(source, request.groups, action.mode);
    case 'clear':
      return clear(source, groupsOf(source, request));
    case 'heading':
      return heading(source, request.blocks, action.level);
    case 'list':
      return list(source, request.blocks, action.list);
    case 'quote':
      return quote(source, request.blocks);
    case 'alert':
      return alert(source, request, action.alert);
  }
}

/** Shifts an offset through a set of edits (`side` decides which way an insertion at the offset goes). */
export function shiftOffset(offset: number, edits: TextEdit[], side: 'start' | 'end'): number {
  let delta = 0;
  for (const edit of edits) {
    const before = side === 'start' ? edit.end <= offset : edit.start < offset && edit.end <= offset;
    if (before) {
      delta += edit.text.length - (edit.end - edit.start);
    }
  }
  return offset + delta;
}

function result(edits: TextEdit[], select?: Span, message?: string): FormatResult {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  return {
    edits: sorted,
    select: select && sorted.length ? { start: shiftOffset(select.start, sorted, 'start'), end: shiftOffset(select.end, sorted, 'end') } : undefined,
    message: sorted.length ? undefined : message,
  };
}

/** The selection's groups, trimmed of surrounding whitespace; empty groups dropped. */
function groupsOf(source: string, request: FormatRequest): Span[][] {
  return request.groups
    .map((group) => group.filter((s) => s.end > s.start))
    .filter((group) => group.length > 0)
    .map((group) => {
      const trimmed = group.map((s) => ({ ...s }));
      const first = trimmed[0];
      while (first.start < first.end && /\s/.test(source[first.start])) {
        first.start++;
      }
      const last = trimmed[trimmed.length - 1];
      while (last.end > last.start && /\s/.test(source[last.end - 1])) {
        last.end--;
      }
      return trimmed.filter((s) => s.end > s.start);
    })
    .filter((group) => group.length > 0);
}

function outer(group: Span[]): Span {
  return { start: group[0].start, end: group[group.length - 1].end };
}

function runLength(source: string, at: number, step: 1 | -1, char: string): number {
  let n = 0;
  for (let i = step === 1 ? at : at - 1; i >= 0 && i < source.length && source[i] === char; i += step) {
    n++;
  }
  return n;
}

// --- Inline marks -----------------------------------------------------------------------------

function wrapMark(source: string, groups: Span[][], mark: InlineMark): FormatResult {
  const edits: TextEdit[] = [];
  for (const group of groups) {
    const { start, end } = outer(group);
    if (mark === 'code') {
      const text = textOf(source, group);
      const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((m) => m.length));
      const fence = '`'.repeat(longest + 1);
      const pad = longest > 0 || text.startsWith('`') || text.endsWith('`') ? ' ' : '';
      edits.push({ start, end, text: `${fence}${pad}${text}${pad}${fence}` });
      continue;
    }
    const { insert, variants } = MARKERS[mark];
    // The same mark inside the selection (between text pieces) is merged into the new one.
    if (insert.length === 2) {
      for (let i = 1; i < group.length; i++) {
        const gap = source.slice(group[i - 1].end, group[i].start);
        const cleaned = variants.reduce((g, v) => g.split(v).join(''), gap);
        if (cleaned !== gap) {
          edits.push({ start: group[i - 1].end, end: group[i].start, text: cleaned });
        }
      }
    }
    if (mark === 'sub' || mark === 'sup') {
      // markdown-it-sub/sup need spaces escaped.
      for (const span of group) {
        for (let i = span.start; i < span.end; i++) {
          if (source[i] === ' ' && source[i - 1] !== '\\') {
            edits.push({ start: i, end: i + 1, text: '\\ ' });
          }
        }
      }
    }
    edits.push({ start, end: start, text: insert }, { start: end, end, text: insert });
  }
  const only = groups.length === 1 ? outer(groups[0]) : undefined;
  return result(edits, only, 'Select some text first.');
}

function unwrapMark(source: string, active: Span, mark: InlineMark): FormatResult {
  const { start, end } = active;
  if (mark === 'code') {
    const before = /(`+)( ?)$/.exec(source.slice(Math.max(0, start - 12), start));
    const after = /^( ?)(`+)/.exec(source.slice(end, end + 12));
    if (before && after && before[1].length === after[2].length && before[2] === after[1]) {
      const open = before[0].length;
      const close = after[0].length;
      return result([{ start: start - open, end: start, text: '' }, { start: end, end: end + close, text: '' }], active);
    }
    return result([], undefined, 'Could not find the code marks around this text; change it in the editor.');
  }
  for (const variant of MARKERS[mark].variants) {
    const char = variant[0];
    const k = variant.length;
    const n = runLength(source, start, -1, char);
    const m = runLength(source, end, 1, char);
    const present = k === 2 ? n >= 2 && m >= 2 : n % 2 === 1 && m % 2 === 1;
    if (present) {
      const edits: TextEdit[] = [{ start: start - k, end: start, text: '' }, { start: end, end: end + k, text: '' }];
      if (mark === 'sub' || mark === 'sup') {
        for (let i = start; i < end; i++) {
          if (source[i] === '\\' && source[i + 1] === ' ') {
            edits.push({ start: i, end: i + 1, text: '' });
          }
        }
      }
      return result(edits, active);
    }
  }
  return result([], undefined, 'Could not find the formatting marks around this text; change it in the editor.');
}

// --- Links ------------------------------------------------------------------------------------

function closingParen(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length && source[i] !== '\n'; i++) {
    if (source[i] === '\\') {
      i++;
    } else if (source[i] === '(') {
      depth++;
    } else if (source[i] === ')' && --depth === 0) {
      return i;
    }
  }
  return -1;
}

function linkDestination(url: string): string {
  return /[\s()<>]/.test(url) ? `<${url.replace(/[<>]/g, encodeURIComponent)}>` : url;
}

function link(source: string, request: FormatRequest, url: string): FormatResult {
  const active = request.active;
  if (active) {
    // Existing inline link: [text](destination)
    const open = source.lastIndexOf('[', active.start);
    const close = source.startsWith('](', active.end) ? active.end : -1;
    const paren = close === -1 ? -1 : closingParen(source, close + 1);
    if (open === -1 || paren === -1 || source.slice(open + 1, active.start).includes('\n')) {
      return result([], undefined, 'Only inline links ([text](url)) can be changed here; change this one in the editor.');
    }
    if (!url) {
      return result([{ start: open, end: open + 1, text: '' }, { start: close, end: paren + 1, text: '' }], active);
    }
    return result([{ start: close + 2, end: paren, text: linkDestination(url) }], active);
  }
  if (!url) {
    return result([], undefined, 'There is no link here to remove.');
  }
  const groups = groupsOf(source, request);
  const edits = groups.flatMap((group) => {
    const { start, end } = outer(group);
    return [{ start, end: start, text: '[' }, { start: end, end, text: `](${linkDestination(url)})` }];
  });
  return result(edits, groups.length === 1 ? outer(groups[0]) : undefined, 'Select some text first.');
}

// --- Colour and size (HTML span) --------------------------------------------------------------

function style(source: string, request: FormatRequest, property: StyleProperty, value: string | null): FormatResult {
  const active = request.active;
  if (active) {
    const before = SPAN_BEFORE.exec(source.slice(Math.max(0, active.start - 300), active.start));
    if (before && source.startsWith(SPAN_CLOSE, active.end)) {
      const css = parseSafeStyle(before[1]);
      if (value === null) {
        css.delete(property);
      } else {
        css.set(property, value);
      }
      const openStart = active.start - before[0].length;
      if (css.size === 0) {
        return result([{ start: openStart, end: active.start, text: '' }, { start: active.end, end: active.end + SPAN_CLOSE.length, text: '' }], active);
      }
      return result([{ start: openStart, end: active.start, text: `<span style="${formatStyle(css)}">` }], active);
    }
  }
  if (value === null) {
    return result([], undefined, 'This text has no such style to remove.');
  }
  const groups = groupsOf(source, request);
  const tag = `<span style="${formatStyle(new Map([[property, value]]))}">`;
  const edits = groups.flatMap((group) => {
    const { start, end } = outer(group);
    return [{ start, end: start, text: tag }, { start: end, end, text: SPAN_CLOSE }];
  });
  return result(edits, groups.length === 1 ? outer(groups[0]) : undefined, 'Select some text first.');
}

// --- Case -------------------------------------------------------------------------------------

function changeCase(source: string, groups: Span[][], mode: CaseMode): FormatResult {
  const edits: TextEdit[] = [];
  let firstLetterDone = false;
  for (const span of groups.flat()) {
    const text = source.slice(span.start, span.end);
    if (span.end <= span.start || /[\\&]/.test(text)) {
      continue; // escapes and entities keep their spelling
    }
    let next: string;
    if (mode === 'upper') {
      next = text.toUpperCase();
    } else if (mode === 'lower') {
      next = text.toLowerCase();
    } else if (mode === 'title') {
      const wordContinues = /[\p{L}\p{N}'’]/u.test(source[span.start - 1] ?? '');
      next = text.toLowerCase().replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (m, sep: string, letter: string, at: number) =>
        at === 0 && sep === '' && wordContinues ? m : sep + letter.toUpperCase(),
      );
    } else {
      next = text.toLowerCase();
      if (!firstLetterDone) {
        const match = /\p{L}/u.exec(next);
        if (match) {
          next = next.slice(0, match.index) + match[0].toUpperCase() + next.slice(match.index + 1);
          firstLetterDone = true;
        }
      }
    }
    if (next !== text && next.length === text.length) {
      edits.push({ start: span.start, end: span.end, text: next });
    }
  }
  const all = groups.flat();
  return result(edits, all.length ? { start: all[0].start, end: all[all.length - 1].end } : undefined, 'Nothing to change.');
}

// --- Clear formatting -------------------------------------------------------------------------

/** Text of a group with markup between the pieces dropped (line breaks and their prefixes kept). */
function textOf(source: string, group: Span[]): string {
  let text = '';
  for (let i = 0; i < group.length; i++) {
    if (i > 0) {
      const gap = source.slice(group[i - 1].end, group[i].start);
      const newline = gap.lastIndexOf('\n');
      if (newline !== -1) {
        text += gap.slice(newline).match(/^\n[ \t>]*/)?.[0] ?? '\n';
      } else if (/^\s+$/.test(gap)) {
        text += gap;
      }
    }
    text += source.slice(group[i].start, group[i].end);
  }
  return text;
}

function clear(source: string, groups: Span[][]): FormatResult {
  const edits: TextEdit[] = [];
  for (const group of groups) {
    let { start, end } = outer(group);
    // Grow over markup that wraps the whole selection: **…**, <span …>…</span>, [ … ](url)
    for (;;) {
      const before = source[start - 1];
      if (before && '*_~=+^`'.includes(before) && source[end] === before) {
        start--;
        end++;
        continue;
      }
      const span = SPAN_BEFORE.exec(source.slice(Math.max(0, start - 300), start));
      if (span && source.startsWith(SPAN_CLOSE, end)) {
        start -= span[0].length;
        end += SPAN_CLOSE.length;
        continue;
      }
      if (before === '[' && source.startsWith('](', end)) {
        const paren = closingParen(source, end + 1);
        if (paren !== -1) {
          start--;
          end = paren + 1;
          continue;
        }
      }
      break;
    }
    const text = textOf(source, group);
    if (source.slice(start, end) !== text) {
      edits.push({ start, end, text });
    }
  }
  return result(edits, undefined, 'There is no formatting to clear here.');
}

// --- Blocks -----------------------------------------------------------------------------------

interface Line {
  start: number;
  text: string;
}

function linesOf(source: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (const text of source.split('\n')) {
    lines.push({ start, text });
    start += text.length + 1;
  }
  return lines;
}

/** Quote markers, indentation and a list marker (with task box) at the start of a line. */
const LINE_PREFIX = /^((?:[ \t]*>[ \t]?)*)([ \t]*)((?:[-*+]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)?/;

function isBlank(text: string): boolean {
  return /^[ \t>]*$/.test(text);
}

/** Lines of a block without trailing blank lines. */
function blockLines(lines: Line[], block: BlockLines): Line[] {
  const result = lines.slice(block.start, Math.min(block.end, lines.length));
  while (result.length && isBlank(result[result.length - 1].text)) {
    result.pop();
  }
  return result;
}

function replaceLines(block: Line[], text: string): TextEdit {
  const last = block[block.length - 1];
  return { start: block[0].start, end: last.start + last.text.length, text };
}

function heading(source: string, blocks: BlockLines[], level: number): FormatResult {
  const lines = linesOf(source);
  const edits: TextEdit[] = [];
  for (const block of blocks.filter((b) => b.type === 'paragraph' || b.type === 'heading')) {
    let own = blockLines(lines, block);
    if (!own.length) {
      continue;
    }
    // Setext heading: drop the === / --- underline.
    if (block.type === 'heading' && own.length > 1 && /^[ \t>]*(=+|-+)[ \t]*$/.test(own[own.length - 1].text)) {
      own = own.slice(0, -1);
      const underline = blockLines(lines, block);
      edits.push({ start: own[own.length - 1].start + own[own.length - 1].text.length, end: underline[underline.length - 1].start + underline[underline.length - 1].text.length, text: '' });
    }
    const prefix = LINE_PREFIX.exec(own[0].text)?.[0] ?? '';
    const contents = own.map((line, i) => {
      const body = i === 0 ? line.text.slice(prefix.length) : line.text.replace(/^(?:[ \t]*>[ \t]?)*[ \t]*/, '');
      return i === 0 ? body.replace(/^#{1,6}(?:[ \t]+|$)/, '').replace(/[ \t]+#+[ \t]*$/, '') : body;
    });
    const content = level > 0 ? contents.map((c) => c.trim()).join(' ') : contents[0];
    const firstLine = `${prefix}${level > 0 ? `${'#'.repeat(level)} ` : ''}${content}`;
    if (level > 0) {
      edits.push(replaceLines(own, firstLine));
    } else if (firstLine !== own[0].text) {
      edits.push(replaceLines([own[0]], firstLine));
    }
  }
  return result(edits.filter((e) => source.slice(e.start, e.end) !== e.text), undefined, 'Select text in a paragraph or heading.');
}

function list(source: string, blocks: BlockLines[], kind: ListKind): FormatResult {
  const lines = linesOf(source);
  const firsts = blocks.map((b) => blockLines(lines, b)[0]).filter((l): l is Line => l !== undefined);
  const unique = firsts.filter((line, i) => firsts.findIndex((l) => l.start === line.start) === i);
  const parsed = unique.map((line) => {
    const m = LINE_PREFIX.exec(line.text) as RegExpExecArray;
    return { line, quote: m[1], indent: m[2], marker: m[3] ?? '', rest: line.text.slice(m[0].length) };
  });
  const isKind = (marker: string) =>
    kind === 'task' ? /\[[ xX]\]/.test(marker) : kind === 'numbered' ? /^\d/.test(marker) : marker !== '' && !/^\d/.test(marker) && !/\[[ xX]\]/.test(marker);
  const remove = parsed.length > 0 && parsed.every((p) => isKind(p.marker));
  const edits = parsed.map((p, i) => {
    const marker = remove ? '' : kind === 'bullet' ? '- ' : kind === 'task' ? '- [ ] ' : `${i + 1}. `;
    return { start: p.line.start, end: p.line.start + p.line.text.length, text: `${p.quote}${p.indent}${marker}${p.rest}` };
  });
  return result(edits.filter((e) => source.slice(e.start, e.end) !== e.text), undefined, 'Select text in a paragraph or list.');
}

function spanLines(lines: Line[], blocks: BlockLines[]): Line[] {
  if (!blocks.length) {
    return [];
  }
  const start = Math.min(...blocks.map((b) => b.start));
  const end = Math.max(...blocks.map((b) => b.end));
  return blockLines(lines, { start, end, type: 'range' });
}

function quote(source: string, blocks: BlockLines[]): FormatResult {
  const own = spanLines(linesOf(source), blocks);
  const quoted = own.length > 0 && own.every((l) => isBlank(l.text) || /^[ \t]*>/.test(l.text));
  const edits = own.map((l) => ({
    start: l.start,
    end: l.start + l.text.length,
    text: quoted ? l.text.replace(/^([ \t]*)>[ \t]?/, '$1') : l.text.trim() === '' ? '>' : `> ${l.text}`,
  }));
  return result(edits.filter((e) => source.slice(e.start, e.end) !== e.text), undefined, 'Select some text first.');
}

function alert(source: string, request: FormatRequest, type: AlertType): FormatResult {
  const lines = linesOf(source);
  if (request.alertLine !== undefined) {
    const line = lines[request.alertLine];
    const marker = line ? /\[!(\w+)\]/.exec(line.text) : null;
    if (!line || !marker) {
      return result([], undefined, 'Could not find the alert marker; change it in the editor.');
    }
    if (marker[1].toUpperCase() === type) {
      // Same type again: turn the alert back into a plain quote.
      const next = lines[request.alertLine + 1];
      return result([{ start: line.start, end: next ? next.start : line.start + line.text.length, text: '' }]);
    }
    const at = line.start + marker.index;
    return result([{ start: at, end: at + marker[0].length, text: `[!${type}]` }]);
  }
  const own = spanLines(lines, request.blocks);
  if (!own.length) {
    return result([], undefined, 'Select some text first.');
  }
  const quoted = own.every((l) => isBlank(l.text) || /^[ \t]*>/.test(l.text));
  const header = `> [!${type}]\n`;
  if (quoted) {
    return result([{ start: own[0].start, end: own[0].start, text: header }]);
  }
  // One edit per line (the header goes into the first one, so no two edits touch the same place).
  return result(
    own.map((l, i) => ({
      start: l.start,
      end: l.start + l.text.length,
      text: (i === 0 ? header : '') + (l.text.trim() === '' ? '>' : `> ${l.text}`),
    })),
  );
}
