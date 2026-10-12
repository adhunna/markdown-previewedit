import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSafeLinkUrl, parseWebviewMessage } from '../src/edit/messages';

const bounds = { length: 100, lineCount: 10 };
const format = (action: unknown, extra: Record<string, unknown> = {}) => ({
  type: 'format',
  version: 3,
  request: { action, groups: [[{ start: 1, end: 5 }]], blocks: [{ start: 0, end: 1, type: 'paragraph' }], ...extra },
});

test('accepts the allowlisted messages', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'ready' }, bounds), { type: 'ready' });
  assert.deepEqual(parseWebviewMessage({ type: 'reveal', line: 4 }, bounds), { type: 'reveal', line: 4 });
  const ok = parseWebviewMessage(format({ kind: 'mark', mark: 'bold' }), bounds);
  assert.equal(ok?.type, 'format');
  assert.ok(parseWebviewMessage(format({ kind: 'style', property: 'color', value: '#00ff00' }), bounds));
  assert.ok(parseWebviewMessage(format({ kind: 'style', property: 'font-size', value: '1.5em' }), bounds));
  assert.ok(parseWebviewMessage(format({ kind: 'style', property: 'color', value: null }), bounds));
  assert.ok(parseWebviewMessage(format({ kind: 'heading', level: 6 }), bounds));
  assert.ok(parseWebviewMessage(format({ kind: 'alert', alert: 'CAUTION' }), bounds));
});

test('rejects unknown types, actions and malformed fields', () => {
  for (const bad of [
    null,
    'ready',
    { type: 'eval', code: 'x' },
    { type: 'reveal', line: 11 },
    { type: 'reveal', line: 1.5 },
    format({ kind: 'mark', mark: 'blink' }),
    format({ kind: 'heading', level: 7 }),
    format({ kind: 'alert', alert: 'DANGER' }),
    format({ kind: 'list', list: 'roman' }),
    { ...format({ kind: 'clear' }), version: -1 },
    { ...format({ kind: 'clear' }), version: '3' },
  ]) {
    assert.equal(parseWebviewMessage(bad, bounds), undefined, JSON.stringify(bad));
  }
});

test('rejects offsets and lines outside the document', () => {
  assert.equal(parseWebviewMessage(format({ kind: 'clear' }, { groups: [[{ start: 90, end: 101 }]] }), bounds), undefined);
  assert.equal(parseWebviewMessage(format({ kind: 'clear' }, { groups: [[{ start: 5, end: 4 }]] }), bounds), undefined);
  assert.equal(parseWebviewMessage(format({ kind: 'clear' }, { blocks: [{ start: 0, end: 11, type: 'paragraph' }] }), bounds), undefined);
  assert.equal(parseWebviewMessage(format({ kind: 'clear' }, { blocks: [{ start: 0, end: 1, type: '<script>' }] }), bounds), undefined);
  assert.equal(parseWebviewMessage(format({ kind: 'clear' }, { active: { start: 0, end: 500 } }), bounds), undefined);
  assert.equal(parseWebviewMessage(format({ kind: 'clear' }, { alertLine: 99 }), bounds), undefined);
  const many = Array.from({ length: 5001 }, () => ({ start: 0, end: 1 }));
  assert.equal(parseWebviewMessage(format({ kind: 'clear' }, { groups: [many] }), bounds), undefined);
});

test('rejects dangerous style values and link URLs', () => {
  for (const value of ['url(javascript:alert(1))', 'expression(alert(1))', 'red; position:fixed', '#12345g', 'var(--x)', '100em', '1em !important', '4px']) {
    const property = /em|px/.test(value) ? 'font-size' : 'color';
    assert.equal(parseWebviewMessage(format({ kind: 'style', property, value }), bounds), undefined, value);
  }
  assert.equal(parseWebviewMessage(format({ kind: 'style', property: 'position', value: 'fixed' }), bounds), undefined);
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:x', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd', 'command:workbench.action.terminal.new', '//evil.example', 'https://x\u0000y']) {
    assert.equal(isSafeLinkUrl(url), false, url);
    assert.equal(parseWebviewMessage(format({ kind: 'link', url }), bounds), undefined, url);
  }
  for (const url of ['https://example.com', 'mailto:a@b.c', 'docs/readme.md', '#section', '../x.png']) {
    assert.equal(isSafeLinkUrl(url), true, url);
  }
});
