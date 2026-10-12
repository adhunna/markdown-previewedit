/**
 * A24: script of the Edit Preview webview. Shows the document (HTML rendered and sanitized by the
 * extension), and a floating formatting toolbar for the selected text. It never edits the file
 * itself: it maps the selection to source offsets (via the `data-src` spans of sourceMap.ts) and
 * sends an allowlisted `format` message; the extension validates it and edits the document.
 *
 * Self-contained, no framework; the toolbar is built with DOM APIs only (no innerHTML).
 */

import type { BlockLines, FormatAction, FormatRequest, InlineMark, Span } from './format';

interface VsCodeApi {
  postMessage(message: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

interface UpdateMessage {
  type: 'update';
  /** Rendered by the extension through the export sanitizer (scripts, handlers, frames removed). */
  html: string;
  version: number;
  theme: 'auto' | 'light' | 'dark';
  fontSize: number;
  select?: Span;
}

const vscode = acquireVsCodeApi();
const main = document.getElementById('mdp-content') as HTMLElement;
let version = -1;
/** The last non-empty selection inside the document (kept while the user works the toolbar). */
let saved: Range | undefined;

// --- Selection → source offsets ---------------------------------------------------------------

const TEXT_BLOCKS = new Set(['paragraph', 'heading']);
const MARK_TAGS: Record<InlineMark, string> = { bold: 'strong', italic: 'em', strike: 's', code: 'code', highlight: 'mark', underline: 'ins', sub: 'sub', sup: 'sup' };

function spanStart(el: HTMLElement): number {
  return Number(el.dataset.src);
}

function spanEnd(el: HTMLElement): number {
  return spanStart(el) + (el.dataset.srclen !== undefined ? Number(el.dataset.srclen) : (el.textContent ?? '').length);
}

/** Source offset of a DOM position inside a traced span. */
function offsetIn(el: HTMLElement, node: Node, offset: number): number {
  if (el.dataset.srclen !== undefined) {
    return offset === 0 && node.nodeType === Node.TEXT_NODE ? spanStart(el) : spanEnd(el);
  }
  if (node.nodeType !== Node.TEXT_NODE) {
    return offset === 0 ? spanStart(el) : spanEnd(el);
  }
  return spanStart(el) + offset;
}

function tracedSpans(range: Range): HTMLElement[] {
  return [...main.querySelectorAll<HTMLElement>('span[data-src]')].filter((el) => range.intersectsNode(el));
}

interface Selected {
  groups: Span[][];
  blocks: BlockLines[];
  spans: HTMLElement[];
}

function selected(range: Range): Selected {
  const spans = tracedSpans(range);
  const groups: Span[][] = [];
  const blocks: BlockLines[] = [];
  let groupKey: Element | null = null;
  for (const el of spans) {
    const start = el.contains(range.startContainer) ? offsetIn(el, range.startContainer, range.startOffset) : spanStart(el);
    const end = el.contains(range.endContainer) ? offsetIn(el, range.endContainer, range.endOffset) : spanEnd(el);
    if (end <= start) {
      continue;
    }
    const key = el.closest('td, th, [data-block]');
    if (key !== groupKey || !groups.length) {
      groups.push([]);
      groupKey = key;
    }
    groups[groups.length - 1].push({ start, end });
    const block = el.closest<HTMLElement>('[data-block="paragraph"], [data-block="heading"]');
    if (block && !el.closest('td, th')) {
      const lines = { start: Number(block.dataset.line), end: Number(block.dataset.lineEnd), type: block.dataset.block ?? '' };
      if (!blocks.some((b) => b.start === lines.start)) {
        blocks.push(lines);
      }
    }
  }
  return { groups, blocks: blocks.filter((b) => TEXT_BLOCKS.has(b.type)), spans };
}

/** The element with this format that contains the whole selection, as a source range. */
function activeRange(range: Range, selector: string): Span | undefined {
  const start = range.startContainer.parentElement?.closest(selector);
  const end = range.endContainer.parentElement?.closest(selector);
  if (!start || start !== end || !main.contains(start)) {
    return undefined;
  }
  const inside = [...start.querySelectorAll<HTMLElement>('span[data-src]')];
  return inside.length ? { start: spanStart(inside[0]), end: spanEnd(inside[inside.length - 1]) } : undefined;
}

function selectorFor(action: FormatAction): string | undefined {
  switch (action.kind) {
    case 'mark':
      return MARK_TAGS[action.mark];
    case 'link':
      return 'a';
    case 'style':
      return 'span[style]';
    default:
      return undefined;
  }
}

function buildRequest(range: Range, action: FormatAction): FormatRequest | undefined {
  const { groups, blocks } = selected(range);
  const selector = selectorFor(action);
  const active = selector ? activeRange(range, selector) : undefined;
  if (!groups.length && !active) {
    return undefined;
  }
  const alert = range.startContainer.parentElement?.closest<HTMLElement>('.markdown-alert[data-line]');
  return { action, groups, blocks, active, alertLine: alert ? Number(alert.dataset.line) : undefined };
}

function act(action: FormatAction): void {
  if (!saved) {
    return;
  }
  const request = buildRequest(saved, action);
  if (!request) {
    return;
  }
  if (action.kind === 'link') {
    const a = saved.startContainer.parentElement?.closest('a');
    vscode.postMessage({ type: 'link', version, request, current: request.active ? a?.getAttribute('href') ?? '' : '' });
  } else {
    vscode.postMessage({ type: 'format', version, request });
  }
}

// --- Source offsets → selection (after an edit) -----------------------------------------------

function positionAt(offset: number, preferEnd: boolean): { node: Node; offset: number } | undefined {
  for (const el of main.querySelectorAll<HTMLElement>('span[data-src]')) {
    const start = spanStart(el);
    const end = spanEnd(el);
    const text = el.firstChild;
    if (!text || offset < start || offset > end || (offset === end && !preferEnd) || (offset === start && preferEnd && offset !== end)) {
      continue;
    }
    if (el.dataset.srclen !== undefined) {
      return { node: text, offset: offset === start ? 0 : (text.textContent ?? '').length };
    }
    return { node: text, offset: offset - start };
  }
  return undefined;
}

function restoreSelection(span: Span): void {
  const from = positionAt(span.start, false);
  const to = positionAt(span.end, true);
  if (!from || !to) {
    return;
  }
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

// --- Toolbar ----------------------------------------------------------------------------------

const toolbar = document.createElement('div');
toolbar.id = 'mdp-toolbar';
toolbar.setAttribute('role', 'toolbar');
toolbar.setAttribute('aria-label', 'Format selection');
toolbar.hidden = true;
document.body.appendChild(toolbar);

const pressed = new Map<HTMLButtonElement, string>();

function button(label: string, title: string, action: FormatAction, className = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-label', title);
  if (className) {
    b.className = className;
  }
  // Keep the document selection: act on mousedown, never take focus.
  b.addEventListener('mousedown', (event) => {
    event.preventDefault();
    act(action);
  });
  const selector = selectorFor(action);
  if (selector) {
    pressed.set(b, selector);
  }
  toolbar.appendChild(b);
  return b;
}

interface Choice {
  label: string;
  action: FormatAction | 'custom';
}

function select(title: string, choices: Choice[], custom?: (value: string) => FormatAction): HTMLSelectElement {
  const s = document.createElement('select');
  s.title = title;
  s.setAttribute('aria-label', title);
  const placeholder = document.createElement('option');
  placeholder.textContent = title;
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  s.appendChild(placeholder);
  choices.forEach((choice, i) => {
    const option = document.createElement('option');
    option.textContent = choice.label;
    option.value = String(i);
    s.appendChild(option);
  });
  s.addEventListener('change', () => {
    const choice = choices[Number(s.value)];
    s.value = '';
    if (!choice) {
      return;
    }
    if (choice.action === 'custom' && custom) {
      picker.onchange = () => act(custom(picker.value));
      picker.click();
    } else if (choice.action !== 'custom') {
      act(choice.action);
    }
  });
  toolbar.appendChild(s);
  return s;
}

function separator(): void {
  const sep = document.createElement('span');
  sep.className = 'mdp-toolbar-sep';
  toolbar.appendChild(sep);
}

const picker = document.createElement('input');
picker.type = 'color';
picker.className = 'mdp-color-picker';
picker.tabIndex = -1;
document.body.appendChild(picker);

const colour = (label: string, value: string | null, property: 'color' | 'background-color'): Choice => ({ label, action: { kind: 'style', property, value } });

select('Text style', [
  { label: 'Normal text', action: { kind: 'heading', level: 0 } },
  { label: 'Title (Heading 1)', action: { kind: 'heading', level: 1 } },
  ...[2, 3, 4, 5, 6].map((level) => ({ label: `Heading ${level}`, action: { kind: 'heading', level } as FormatAction })),
]).classList.add('mdp-block-only');
separator();
button('B', 'Bold (Ctrl+B)', { kind: 'mark', mark: 'bold' }, 'mdp-bold');
button('I', 'Italic (Ctrl+I)', { kind: 'mark', mark: 'italic' }, 'mdp-italic');
button('S', 'Strikethrough', { kind: 'mark', mark: 'strike' }, 'mdp-strike');
button('U', 'Underline (++text++)', { kind: 'mark', mark: 'underline' }, 'mdp-underline');
button('H', 'Highlight (==text==)', { kind: 'mark', mark: 'highlight' }, 'mdp-highlight');
button('</>', 'Inline code', { kind: 'mark', mark: 'code' });
button('x₂', 'Subscript', { kind: 'mark', mark: 'sub' });
button('x²', 'Superscript', { kind: 'mark', mark: 'sup' });
button('🔗', 'Link…', { kind: 'link', url: '' });
separator();
button('•', 'Bulleted list', { kind: 'list', list: 'bullet' }, 'mdp-block-only');
button('1.', 'Numbered list', { kind: 'list', list: 'numbered' }, 'mdp-block-only');
button('☐', 'Task list', { kind: 'list', list: 'task' }, 'mdp-block-only');
button('❝', 'Quote', { kind: 'quote' }, 'mdp-block-only');
select('Alert', (['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const).map((alert) => ({ label: alert[0] + alert.slice(1).toLowerCase(), action: { kind: 'alert', alert } }))).classList.add('mdp-block-only');
separator();
select('Aa', [
  { label: 'UPPERCASE', action: { kind: 'case', mode: 'upper' } },
  { label: 'lowercase', action: { kind: 'case', mode: 'lower' } },
  { label: 'Title Case', action: { kind: 'case', mode: 'title' } },
  { label: 'Sentence case', action: { kind: 'case', mode: 'sentence' } },
]);
const HTML_NOTE = ' — written as HTML: shown here and in exports, not on GitHub';
select(
  'Colour',
  [
    colour('Default colour', null, 'color'),
    colour('Red', '#d1242f', 'color'),
    colour('Orange', '#bc4c00', 'color'),
    colour('Green', '#1a7f37', 'color'),
    colour('Blue', '#0969da', 'color'),
    colour('Purple', '#8250df', 'color'),
    colour('Pink', '#bf3989', 'color'),
    colour('Grey', '#59636e', 'color'),
    { label: 'Custom…', action: 'custom' },
  ],
  (value) => ({ kind: 'style', property: 'color', value }),
).title = `Text colour${HTML_NOTE}`;
select(
  'Fill',
  [
    colour('No fill', null, 'background-color'),
    colour('Yellow', '#fff8c5', 'background-color'),
    colour('Green', '#dafbe1', 'background-color'),
    colour('Blue', '#ddf4ff', 'background-color'),
    colour('Pink', '#ffeff7', 'background-color'),
    colour('Grey', '#eaeef2', 'background-color'),
    { label: 'Custom…', action: 'custom' },
  ],
  (value) => ({ kind: 'style', property: 'background-color', value }),
).title = `Background colour${HTML_NOTE}`;
select('Size', [
  { label: 'Default size', action: { kind: 'style', property: 'font-size', value: null } },
  { label: 'Small', action: { kind: 'style', property: 'font-size', value: '0.85em' } },
  { label: 'Large', action: { kind: 'style', property: 'font-size', value: '1.25em' } },
  { label: 'X-Large', action: { kind: 'style', property: 'font-size', value: '1.5em' } },
  { label: 'XX-Large', action: { kind: 'style', property: 'font-size', value: '2em' } },
]).title = `Text size${HTML_NOTE}`;
separator();
button('✕', 'Clear formatting', { kind: 'clear' });

function hideToolbar(): void {
  toolbar.hidden = true;
}

function showToolbar(range: Range): void {
  const { groups, blocks } = selected(range);
  if (!groups.length) {
    hideToolbar();
    return;
  }
  toolbar.classList.toggle('mdp-no-blocks', blocks.length === 0);
  for (const [b, selector] of pressed) {
    b.classList.toggle('mdp-pressed', activeRange(range, selector) !== undefined);
  }
  toolbar.hidden = false;
  const rect = range.getBoundingClientRect();
  const width = toolbar.offsetWidth;
  const left = Math.max(8, Math.min(rect.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - width - 8));
  const above = rect.top + window.scrollY - toolbar.offsetHeight - 8;
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${above < window.scrollY ? rect.bottom + window.scrollY + 8 : above}px`;
}

function onSelectionChange(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    // Clicking a toolbar <select> moves focus but keeps `saved`; only hide on a real collapse.
    if (!toolbar.contains(document.activeElement)) {
      hideToolbar();
    }
    return;
  }
  const range = selection.getRangeAt(0);
  if (!main.contains(range.commonAncestorContainer)) {
    return;
  }
  saved = range.cloneRange();
  showToolbar(range);
}

let selectionTimer: ReturnType<typeof setTimeout> | undefined;
document.addEventListener('selectionchange', () => {
  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(onSelectionChange, 120);
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && saved && !toolbar.hidden) {
    const key = event.key.toLowerCase();
    if (key === 'b' || key === 'i') {
      event.preventDefault();
      act({ kind: 'mark', mark: key === 'b' ? 'bold' : 'italic' });
    }
  } else if (event.key === 'Escape') {
    hideToolbar();
  }
});

// Links are not followed in the Edit Preview; double-click reveals the source line.
main.addEventListener('click', (event) => {
  if ((event.target as Element | null)?.closest('a')) {
    event.preventDefault();
  }
});
main.addEventListener('dblclick', (event) => {
  const line = (event.target as Element | null)?.closest<HTMLElement>('[data-line]')?.dataset.line;
  if (line !== undefined) {
    vscode.postMessage({ type: 'reveal', line: Number(line) });
  }
});

// --- Updates from the extension -------------------------------------------------------------

function applySettings(theme: UpdateMessage['theme'], fontSize: number): void {
  let marker = document.querySelector<HTMLElement>('.mdp-settings');
  if (theme === 'auto') {
    marker?.remove();
  } else {
    if (!marker) {
      marker = document.createElement('span');
      marker.className = 'mdp-settings';
      marker.hidden = true;
      document.body.prepend(marker);
    }
    marker.dataset.mdpTheme = theme;
  }
  main.style.fontSize = `${fontSize}px`;
}

function update(message: UpdateMessage): void {
  // Keep the reader's place: remember the first visible block and put it back afterwards.
  const blocks = [...main.querySelectorAll<HTMLElement>('[data-line]')];
  const anchor = blocks.find((el) => el.getBoundingClientRect().bottom > 0);
  const anchorLine = anchor?.dataset.line;
  const anchorTop = anchor?.getBoundingClientRect().top ?? 0;

  version = message.version;
  applySettings(message.theme, message.fontSize);
  main.innerHTML = message.html; // sanitized by the extension (src/export/engine.ts)
  saved = undefined;
  hideToolbar();

  if (anchorLine !== undefined) {
    const again = main.querySelector<HTMLElement>(`[data-line="${CSS.escape(anchorLine)}"]`);
    if (again) {
      window.scrollBy(0, again.getBoundingClientRect().top - anchorTop);
    }
  }
  window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent'));
  if (message.select) {
    restoreSelection(message.select);
  }
}

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = event.data as Partial<UpdateMessage> | null;
  if (message?.type === 'update' && typeof message.html === 'string' && typeof message.version === 'number') {
    update(message as UpdateMessage);
  }
});

vscode.postMessage({ type: 'ready' });
