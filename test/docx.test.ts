import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { renderDocx } from '../src/export/docx';
import { sample } from './helpers';

async function documentXml(markdown: string): Promise<{ doc: string; core: string }> {
  const zip = await JSZip.loadAsync(await renderDocx(markdown));
  return {
    doc: await zip.file('word/document.xml')!.async('string'),
    core: await zip.file('docProps/core.xml')!.async('string'),
  };
}

test('feature tour becomes a Word document with real styles', async () => {
  const { doc, core } = await documentXml(sample('features', 'all.md'));
  assert.match(core, /<dc:title>MarkDownPreview Feature Tour<\/dc:title>/);
  assert.match(doc, /<w:pStyle w:val="Heading1"\/>/);
  assert.match(doc, /<w:pStyle w:val="Heading2"\/>/);
  assert.match(doc, /<w:numPr>/, 'lists use Word numbering');
  assert.match(doc, /<w:tbl>/, 'tables are Word tables');
  assert.match(doc, /<w:tblHeader\/>/, 'header row repeats');
  assert.match(doc, /<w:hyperlink /, 'links are hyperlinks');
  assert.match(doc, /<w:pStyle w:val="MdpCode"\/>/, 'code blocks use the Code Block style');
  assert.match(doc, /<w:pStyle w:val="MdpQuote"\/>/, 'alerts use the Block Quote style');
  assert.match(doc, /☑ <\/w:t>[\s\S]{0,200}Write the plan/);
  assert.match(doc, /☐ <\/w:t>[\s\S]{0,200}Ship the MVP/);
  assert.match(doc, /Mermaid diagram/);
  assert.match(doc, /<w:t xml:space="preserve">Contents<\/w:t>/);
  assert.doesNotMatch(doc, /title: MarkDownPreview/, 'front matter is not exported');
  assert.match(doc, /<w:highlight w:val="yellow"\/>/, '==mark== is highlighted');
  assert.match(doc, /<w:vertAlign w:val="subscript"\/>/, 'H~2~O uses subscript');
  assert.match(doc, /<w:vertAlign w:val="superscript"\/>/, 'x^2^ and footnote refs use superscript');
  assert.match(doc, /🎉/, 'emoji shortcodes are converted');
  assert.match(doc, />Careful</, '::: container title is kept');
  assert.match(doc, /And here is the footnote\./);
  assert.doesNotMatch(doc, /==highlight==|:tada:|\*\[HTML\]/, 'no raw extended syntax leaks into Word');
});

test('only web and mail links become hyperlinks', async () => {
  const { doc } = await documentXml('[a](https://example.com) [b](javascript:alert(1)) [c](./local.md)');
  assert.equal((doc.match(/<w:hyperlink /g) ?? []).length, 1);
});

test('colour, fill and size spans become Word run formatting', async () => {
  const { doc } = await documentXml('Make <span style="color:#d1242f; font-size:1.25em">this</span> and <span style="background-color:yellow">that</span> stand out.');
  assert.match(doc, /<w:color w:val="D1242F"\/>[\s\S]{0,120}<w:sz w:val="28"\/>[\s\S]{0,200}>this<\/w:t>/);
  assert.match(doc, /<w:shd [^>]*w:fill="FFFF00"[^>]*\/>[\s\S]{0,200}>that<\/w:t>/);
  assert.doesNotMatch(doc, /&lt;span/);
});
