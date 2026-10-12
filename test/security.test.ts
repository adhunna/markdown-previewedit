import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDocx } from '../src/export/docx';
import { renderHtmlDocument } from '../src/export/html';
import { assets, mainContent, maliciousSamples } from './helpers';

const FORBIDDEN_TAGS = /<\s*(script|iframe|object|embed|form|input|meta|link|style|base|applet)\b/i;
const EVENT_HANDLER = /<[^>]*\son[a-z]+\s*=/i;
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
    const head = html.slice(0, html.indexOf('<body'));
    assert.doesNotMatch(head.replace(/<style>[\s\S]*?<\/style>/, ''), /<script/i, 'nothing injected into <head>');
  });

  test(`hostile sample ${name}: Word export succeeds`, async () => {
    const bytes = await renderDocx(markdown);
    assert.ok(bytes.length > 0);
  });
}
