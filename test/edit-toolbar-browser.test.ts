import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import puppeteer, { type Page } from 'puppeteer-core';
import { applyFormat, type FormatRequest } from '../src/edit/format';
import { parseWebviewMessage } from '../src/edit/messages';
import { renderEditPreview } from '../src/edit/render';
import { findBrowser } from '../src/export/browser';
import { root } from './helpers';

const browserPath = findBrowser(process.env.MDP_TEST_BROWSER);
const skip = browserPath ? false : 'no Edge/Chrome/Chromium found (set MDP_TEST_BROWSER)';

async function withPage(run: (page: Page) => Promise<void>): Promise<void> {
  const browser = await puppeteer.launch({
    executablePath: browserPath!, // skip is set when there is no browser
    args: process.getuid?.() === 0 || process.env.CI ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    const css = readFileSync(join(root, 'media', 'mdp-edit.css'), 'utf8');
    await page.setContent(`<html><head><style>${css}</style></head><body class="vscode-light"><main id="mdp-content"></main></body></html>`);
    await page.evaluate(() => {
      const w = window as unknown as { __sent: unknown[]; acquireVsCodeApi: () => unknown };
      w.__sent = [];
      w.acquireVsCodeApi = () => ({ postMessage: (m: unknown) => w.__sent.push(JSON.parse(JSON.stringify(m))) });
    });
    await page.addScriptTag({ content: readFileSync(join(root, 'dist', 'edit', 'toolbar.js'), 'utf8') });
    await run(page);
  } finally {
    await browser.close();
  }
}

async function update(page: Page, source: string, version: number, select?: { start: number; end: number }) {
  const html = renderEditPreview(source, { mermaid: false });
  await page.evaluate((message) => window.postMessage(message, '*'), { type: 'update', html, version, theme: 'auto', fontSize: 14, select });
  await page.waitForFunction((v) => document.querySelector('#mdp-content')?.innerHTML.includes('data-src') && v >= 0, {}, version);
}

async function selectText(page: Page, text: string) {
  // Start from no selection, so the toolbar shown afterwards belongs to this one.
  await page.evaluate(() => window.getSelection()!.removeAllRanges());
  await page.waitForFunction(() => document.getElementById('mdp-toolbar')!.hidden);
  await page.evaluate((wanted) => {
    for (const span of document.querySelectorAll<HTMLElement>('span[data-src]')) {
      const node = span.firstChild as Text | null;
      const at = node?.data.indexOf(wanted) ?? -1;
      if (node && at !== -1) {
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + wanted.length);
        window.getSelection()!.removeAllRanges();
        window.getSelection()!.addRange(range);
        return;
      }
    }
    throw new Error(`${wanted} not found`);
  }, text);
  await page.waitForFunction(() => !document.getElementById('mdp-toolbar')!.hidden);
}

const sent = (page: Page) => page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent);

test('selecting a word and clicking Bold sends a validated format message; the result re-selects', { skip }, async () => {
  await withPage(async (page) => {
    let source = 'Hello brave world\n\n- item one\n';
    await update(page, source, 7);
    assert.deepEqual((await sent(page))[0], { type: 'ready' });

    await selectText(page, 'brave');
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('#mdp-toolbar button[title^="Bold"]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
    const messages = await sent(page);
    const message = messages[messages.length - 1];
    assert.deepEqual(message, {
      type: 'format',
      version: 7,
      request: { action: { kind: 'mark', mark: 'bold' }, groups: [[{ start: 6, end: 11 }]], blocks: [{ start: 0, end: 1, type: 'paragraph' }] },
    });

    // What the extension does with it: validate, apply, re-render with the new selection.
    const parsed = parseWebviewMessage(message, { length: source.length, lineCount: 4 });
    assert.equal(parsed?.type, 'format');
    const result = applyFormat(source, (parsed as { request: FormatRequest }).request);
    for (const edit of [...result.edits].reverse()) {
      source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    }
    assert.equal(source, 'Hello **brave** world\n\n- item one\n');
    await update(page, source, 8, result.select);
    await page.waitForFunction(() => window.getSelection()?.toString() === 'brave');
    await page.waitForFunction(() => document.querySelector('#mdp-toolbar button[title^="Bold"]')?.classList.contains('mdp-pressed'));
  });
});

test('block controls hide for table cells, and a heading choice sends the block lines', { skip }, async () => {
  await withPage(async (page) => {
    await update(page, '| a | b |\n|---|---|\n| cell | two |\n\nPlain text\n', 1);
    await selectText(page, 'cell');
    assert.equal(await page.evaluate(() => document.getElementById('mdp-toolbar')!.classList.contains('mdp-no-blocks')), true);

    await selectText(page, 'Plain');
    assert.equal(await page.evaluate(() => document.getElementById('mdp-toolbar')!.classList.contains('mdp-no-blocks')), false);
    await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#mdp-toolbar select[title="Text style"]')!;
      select.value = '1'; // Title (Heading 1)
      select.dispatchEvent(new Event('change'));
    });
    const messages = await sent(page);
    const last = messages[messages.length - 1] as { request: FormatRequest };
    assert.deepEqual(last.request.action, { kind: 'heading', level: 1 });
    assert.deepEqual(last.request.blocks, [{ start: 4, end: 5, type: 'paragraph' }]);
  });
});

test('the toolbar is built without HTML injection: document content cannot add controls', { skip }, async () => {
  await withPage(async (page) => {
    await update(page, 'Text <button id="evil">x</button> and <img src=x onerror="window.__pwned=1">\n', 1);
    assert.equal(await page.evaluate(() => document.getElementById('evil')), null);
    assert.equal(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned), undefined);
  });
});
