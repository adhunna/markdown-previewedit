import { ALERT_TYPES, CASE_MODES, INLINE_MARKS, LIST_KINDS, type BlockLines, type FormatAction, type FormatRequest, type Span } from './format';
import { isSafeStyleValue, STYLE_PROPERTIES, type StyleProperty } from '../markdown/styles';

/**
 * A24 / J04: the only messages the Edit Preview webview may send, and their validation. Anything
 * that does not match exactly is rejected — the webview shows document content and is not trusted.
 */

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'reveal'; line: number }
  | { type: 'format'; version: number; request: FormatRequest }
  /** Ask the extension for a link URL (VS Code input box), then format. */
  | { type: 'link'; version: number; request: FormatRequest; current?: string };

/** Size of the document the message refers to (LF text). */
export interface DocumentBounds {
  length: number;
  lineCount: number;
}

const MAX_SPANS = 5000;
const MAX_BLOCKS = 2000;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInt(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function span(value: unknown, bounds: DocumentBounds): Span | undefined {
  if (!isObject(value) || !isInt(value.start, 0, bounds.length) || !isInt(value.end, value.start as number, bounds.length)) {
    return undefined;
  }
  return { start: value.start as number, end: value.end as number };
}

function block(value: unknown, bounds: DocumentBounds): BlockLines | undefined {
  if (!isObject(value) || !isInt(value.start, 0, bounds.lineCount) || !isInt(value.end, value.start as number, bounds.lineCount) || typeof value.type !== 'string' || !/^[a-z_]{1,20}$/.test(value.type)) {
    return undefined;
  }
  return { start: value.start as number, end: value.end as number, type: value.type };
}

/** Accepts `http(s):`, `mailto:`, in-document `#anchors` and relative paths; nothing else. */
export function isSafeLinkUrl(url: string): boolean {
  if (url.length > 2048 || /[\u0000-\u001f\u007f]/.test(url)) {
    return false;
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
  return scheme === undefined ? !url.startsWith('//') : ['http', 'https', 'mailto'].includes(scheme);
}

function action(value: unknown): FormatAction | undefined {
  if (!isObject(value)) {
    return undefined;
  }
  switch (value.kind) {
    case 'mark':
      return oneOf(value.mark, INLINE_MARKS) ? { kind: 'mark', mark: value.mark } : undefined;
    case 'link':
      return typeof value.url === 'string' && (value.url === '' || isSafeLinkUrl(value.url)) ? { kind: 'link', url: value.url } : undefined;
    case 'style': {
      if (!oneOf<StyleProperty>(value.property, STYLE_PROPERTIES)) {
        return undefined;
      }
      if (value.value === null) {
        return { kind: 'style', property: value.property, value: null };
      }
      return typeof value.value === 'string' && isSafeStyleValue(value.property, value.value) ? { kind: 'style', property: value.property, value: value.value } : undefined;
    }
    case 'case':
      return oneOf(value.mode, CASE_MODES) ? { kind: 'case', mode: value.mode } : undefined;
    case 'clear':
      return { kind: 'clear' };
    case 'heading':
      return isInt(value.level, 0, 6) ? { kind: 'heading', level: value.level } : undefined;
    case 'list':
      return oneOf(value.list, LIST_KINDS) ? { kind: 'list', list: value.list } : undefined;
    case 'quote':
      return { kind: 'quote' };
    case 'alert':
      return oneOf(value.alert, ALERT_TYPES) ? { kind: 'alert', alert: value.alert } : undefined;
    default:
      return undefined;
  }
}

function request(value: unknown, bounds: DocumentBounds): FormatRequest | undefined {
  if (!isObject(value) || !Array.isArray(value.groups) || !Array.isArray(value.blocks) || value.blocks.length > MAX_BLOCKS) {
    return undefined;
  }
  const act = action(value.action);
  if (!act) {
    return undefined;
  }
  let count = 0;
  const groups: Span[][] = [];
  for (const group of value.groups) {
    if (!Array.isArray(group) || (count += group.length) > MAX_SPANS) {
      return undefined;
    }
    const spans = group.map((s) => span(s, bounds));
    if (spans.some((s) => s === undefined)) {
      return undefined;
    }
    groups.push(spans as Span[]);
  }
  const blocks = value.blocks.map((b) => block(b, bounds));
  if (blocks.some((b) => b === undefined)) {
    return undefined;
  }
  const active = value.active === undefined ? undefined : span(value.active, bounds);
  if (value.active !== undefined && !active) {
    return undefined;
  }
  if (value.alertLine !== undefined && !isInt(value.alertLine, 0, bounds.lineCount)) {
    return undefined;
  }
  return { action: act, groups, blocks: blocks as BlockLines[], active, alertLine: value.alertLine as number | undefined };
}

/** Returns the message if it is one we accept, with every field checked; otherwise undefined. */
export function parseWebviewMessage(value: unknown, bounds: DocumentBounds): WebviewMessage | undefined {
  if (!isObject(value)) {
    return undefined;
  }
  switch (value.type) {
    case 'ready':
      return { type: 'ready' };
    case 'reveal':
      return isInt(value.line, 0, bounds.lineCount) ? { type: 'reveal', line: value.line } : undefined;
    case 'format':
    case 'link': {
      if (!isInt(value.version, 0, Number.MAX_SAFE_INTEGER)) {
        return undefined;
      }
      const req = request(value.request, bounds);
      if (!req) {
        return undefined;
      }
      if (value.type === 'format') {
        return { type: 'format', version: value.version, request: req };
      }
      const current = typeof value.current === 'string' && value.current.length <= 2048 ? value.current : undefined;
      return { type: 'link', version: value.version, request: req, current };
    }
    default:
      return undefined;
  }
}
