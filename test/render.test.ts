import assert from 'node:assert/strict';
import { test } from 'node:test';
import MarkdownIt from 'markdown-it';
import { parseFrontMatter } from '../src/export/engine';
import { renderHtmlDocument } from '../src/export/html';
import { extendMarkdownIt } from '../src/markdown/plugins';
import { slugify } from '../src/markdown/slug';
import { assets, mainContent, sample } from './helpers';

test('feature tour renders every added syntax in HTML export', () => {
  const { html, title, hasMermaid } = renderHtmlDocument(sample('features', 'all.md'), assets(), { mermaid: true });
  const body = mainContent(html);
  assert.equal(title, 'MarkDownPreview Feature Tour');
  assert.equal(hasMermaid, true);
  for (const type of ['note', 'tip', 'important', 'warning', 'caution']) {
    assert.match(body, new RegExp(`class="markdown-alert markdown-alert-${type}"`), `alert ${type}`);
  }
  assert.match(body, /class="mdp-container mdp-container-warning"/);
  assert.match(body, /<p class="mdp-container-title">Careful<\/p>/);
  assert.match(body, /<details class="mdp-details"><summary>Click to expand<\/summary>/);
  assert.match(body, /<nav class="mdp-toc">/);
  assert.match(body, /<a href="#text-formatting">Text formatting<\/a>/);
  assert.match(body, /<h2 id="text-formatting">/);
  assert.match(body, /<div class="mdp-mermaid"><pre class="mdp-mermaid-source">flowchart LR/);
  assert.match(body, /class="katex"/);
  assert.match(body, /class="katex-display"/);
  assert.match(body, /<mark>highlight<\/mark>/);
  assert.match(body, /<ins>inserted<\/ins>/);
  assert.match(body, /H<sub>2<\/sub>O/);
  assert.match(body, /x<sup>2<\/sup>/);
  assert.match(body, /🎉/);
  assert.match(body, /<abbr title="HyperText Markup Language">HTML<\/abbr>/);
  assert.match(body, /<dl>/);
  assert.match(body, /class="footnotes/);
  assert.match(body, /<table>/);
  assert.match(body, /<li class="mdp-task-item"><span class="mdp-task mdp-task-done" role="img" aria-label="done">☑<\/span> Write the plan/);
  assert.match(body, /<span class="mdp-task" role="img" aria-label="not done">☐<\/span> Ship the MVP/);
  assert.doesNotMatch(body, /title: MarkDownPreview/, 'front matter is not rendered');
  assert.match(html, /<style>[\s\S]*data:font\/woff2;base64/, 'KaTeX fonts are embedded');
  assert.match(html, /<script>/, 'Mermaid renderer is embedded');
});

test('HTML export omits Mermaid and KaTeX payloads when unused', () => {
  const { html, hasMermaid } = renderHtmlDocument('# Plain\n\nJust text.', assets(), { mermaid: true });
  assert.equal(hasMermaid, false);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /data:font\/woff2/);
});

test('Mermaid can be switched off', () => {
  const { html } = renderHtmlDocument('```mermaid\ngraph TD\n A-->B\n```', assets(), { mermaid: false });
  assert.doesNotMatch(mainContent(html), /mdp-mermaid/);
  assert.match(mainContent(html), /<code class="language-mermaid">/);
});

test('preview plugins keep VS Code scroll-sync attributes on custom blocks', () => {
  const md = new MarkdownIt({ html: true });
  extendMarkdownIt(md, { isMermaidEnabled: () => true, addHeadingIds: false });
  // Simulate VS Code's source-map plugin, which tags block tokens with class/data-line.
  md.core.ruler.push('fake_source_map', (state) => {
    for (const token of state.tokens) {
      if (token.map && token.nesting >= 0) {
        token.attrJoin('class', 'code-line');
        token.attrSet('data-line', String(token.map[0]));
      }
    }
  });
  const html = md.render('> [!TIP]\n> Hi\n\n```mermaid\ngraph TD\n```\n\n::: note\nBox\n:::\n');
  assert.match(html, /<div class="markdown-alert markdown-alert-tip code-line" data-line="0">/);
  assert.match(html, /<div class="mdp-mermaid code-line" data-line="3">/);
  assert.match(html, /<div class="mdp-container mdp-container-note code-line" data-line="7">/);
  assert.doesNotMatch(html, /<h\d id=/, 'preview leaves heading ids to VS Code');
});

test('slugs follow GitHub/VS Code rules', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify('  C# & .NET 10 '), 'c--net-10');
  assert.equal(slugify('Ünïcode Título'), encodeURI('ünïcode-título'));
});

test('front matter title is read without evaluating YAML', () => {
  assert.deepEqual(parseFrontMatter('---\ntitle: "Hello"\nother: 1\n---\n# Body\n'), { title: 'Hello', body: '# Body\n' });
  assert.deepEqual(parseFrontMatter('# No front matter'), { title: undefined, body: '# No front matter' });
});
