import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDocx } from '../src/export/docx';
import { renderEditPreview } from '../src/edit/render';
import { renderHtmlDocument } from '../src/export/html';
import { assets, mainContent, maliciousSamples } from './helpers';

const FORBIDDEN_TAGS = /<\s*(script|iframe|object|embed|form|input|meta|link|style|base|applet)\b/i;
const EVENT_HANDLER = /<[^>]*\son[a-z]+\s*=/i;
/** Inline CSS that could load URLs, run code or cover the page. */
const DANGEROUS_CSS = /style\s*=\s*"[^"]*(url\(|expression|behavior|binding|position|@import|var\()/i;
const DANGEROUS_URL = /\b(href|src|action|formaction|xlink:href)\s*=\s*["']?\s*(javascript|vbscript|data:text)/i;

for (const { name, markdown } of maliciousSamples()) {
  test(`hostile sample ${name}: exported HTML contains no active content`, () => {
    const input = name === 'large-input.md' ? markdown.repeat(2000) : markdown;
    const started = Date.now();
    const { html } = renderHtmlDocument(input, assets(), { mermaid: true });
    assert.ok(Date.now() - started < 5000, 'renders quickly');
    const body = mainContent(html);
    assert.doesNotMatch(body, FORBIDDEN_TAGS);
    assert.doesNotMatch(body, EVENT_HANDLER);
    assert.doesNotMatch(body, DANGEROUS_URL);
    assert.doesNotMatch(body, DANGEROUS_CSS);
    const head = html.slice(0, html.indexOf('<body'));
    assert.doesNotMatch(head.replace(/<style>[\s\S]*?<\/style>/, ''), /<script/i, 'nothing injected into <head>');
  });

  test(`hostile sample ${name}: Edit Preview HTML contains no active content`, () => {
    const html = renderEditPreview(markdown, { mermaid: true });
    assert.doesNotMatch(html, FORBIDDEN_TAGS);
    assert.doesNotMatch(html, EVENT_HANDLER);
    assert.doesNotMatch(html, DANGEROUS_URL);
    assert.doesNotMatch(html, DANGEROUS_CSS);
  });

  test(`hostile sample ${name}: Word export succeeds`, async () => {
    const bytes = await renderDocx(markdown);
    assert.ok(bytes.length > 0);
  });
}

test('styled spans keep only colour, background and a bounded font size', () => {
  const body = mainContent(renderHtmlDocument(maliciousSamples().find((s) => s.name === 'css-injection.md')!.markdown, assets(), { mermaid: false }).html);
  assert.match(body, /<span style="color:red">overlay<\/span>/);
  assert.match(body, /<span>tracking pixel<\/span>/);
  assert.match(body, /<span>huge text<\/span>/);
  assert.match(body, /<span style="color:rgb\(9,105,218\); font-size:1.25em">this one is fine<\/span>/);
  assert.match(body, /<div>block with tracking<\/div>/);
});
