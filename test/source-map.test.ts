import assert from 'node:assert/strict';
import { test } from 'node:test';
import MarkdownIt from 'markdown-it';
import { normalizeSource, renderEditPreview } from '../src/edit/render';
import { sample } from './helpers';

const unescape = (html: string) => html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const md = new MarkdownIt();

interface Mapped {
  src: number;
  srcLen?: number;
  text: string;
}

function mappedSpans(html: string): Mapped[] {
  return [...html.matchAll(/<span data-src="(\d+)"(?: data-srclen="(\d+)")?>([^<]*)<\/span>/g)].map((m) => ({
    src: Number(m[1]),
    srcLen: m[2] === undefined ? undefined : Number(m[2]),
    text: unescape(m[3]),
  }));
}

/** Every traced character must be exactly what the source has at that offset. */
function assertExact(source: string, html: string): Mapped[] {
  const spans = mappedSpans(html);
  for (const span of spans) {
    const written = source.slice(span.src, span.src + (span.srcLen ?? span.text.length));
    assert.equal(span.srcLen === undefined ? written : md.utils.unescapeAll(written), span.text, `offset ${span.src}: ${JSON.stringify(written)}`);
  }
  return spans;
}

test('every traced character in the feature tour points at the same text in the source', () => {
  const source = normalizeSource(sample('features', 'all.md'));
  const html = renderEditPreview(source, { mermaid: true });
  const spans = assertExact(source, html);
  assert.ok(spans.length > 50, `only ${spans.length} spans`);
  // Nearly all visible paragraph text is traceable.
  const traced = spans.reduce((n, s) => n + s.text.length, 0);
  const visible = unescape(html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<span class="katex[\s\S]*?<\/span><\/span><\/span>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, '').length;
  assert.ok(traced / visible > 0.85, `traced ${traced} of ${visible} visible characters`);
});

test('blocks carry their source lines, counted from the top of the file (front matter included)', () => {
  const source = '---\ntitle: T\n---\n# Head\n\nPara one\nline two\n\n- item\n';
  const html = renderEditPreview(source, { mermaid: false });
  assert.match(html, /<h1 id="head" data-line="3" data-line-end="4" data-block="heading"/);
  assert.match(html, /<p data-line="5" data-line-end="7" data-block="paragraph"/);
  assert.match(html, /<li data-line="8" data-line-end="9" data-block="list_item"/);
  assertExact(source, html);
});

test('escapes, entities, links, emphasis, code, tables and quotes are traced exactly', () => {
  const source = [
    'A \\*literal\\* star &amp; [link *text*](https://example.com/x) after x and `co de` end.',
    '',
    '> quoted **bold** line',
    '> second line',
    '',
    '| a | b |',
    '|---|---|',
    '| cell one | cell *two* |',
    '',
    '- [x] done x',
    '- item with :tada: emoji and $x^2$ math',
    '',
    '> [!NOTE]',
    '> Alert text',
  ].join('\n');
  const html = renderEditPreview(source, { mermaid: false });
  const spans = assertExact(source, html);
  const texts = spans.map((s) => s.text);
  for (const expected of ['literal', 'text', ' after x and ', 'co de', 'quoted ', 'bold', 'second line', 'cell one', 'two', 'done x', 'Alert text']) {
    assert.ok(texts.some((t) => t.includes(expected)), `${expected} not traced: ${JSON.stringify(texts)}`);
  }
  // The escaped star is its own span with the length of "\*".
  assert.ok(spans.some((s) => s.text === '*' && s.srcLen === 2));
  assert.ok(spans.some((s) => s.text === '&' && s.srcLen === 5));
});

test('CRLF files are normalized before mapping', () => {
  assert.equal(normalizeSource('a\r\nb\rc'), 'a\nb\nc');
});
