import assert from 'node:assert/strict';
import { test } from 'node:test';
import MarkdownIt from 'markdown-it';
import { renderHtmlDocument } from '../src/export/html';
import { extendMarkdownIt } from '../src/markdown/plugins';
import { nextPreviewTheme, stepFontSize, type PreviewTheme } from '../src/preview-settings';
import { assets, mainContent } from './helpers';

test('font size steps by one pixel and stays within 8–40', () => {
  assert.equal(stepFontSize(14, 1), 15);
  assert.equal(stepFontSize(14, -1), 13);
  assert.equal(stepFontSize(undefined, 1), 15, 'unset means the default of 14');
  assert.equal(stepFontSize(Number.NaN, -1), 13);
  assert.equal(stepFontSize(8, -1), 8);
  assert.equal(stepFontSize(40, 1), 40);
  assert.equal(stepFontSize(14.6, 1), 16, 'fractional values are rounded first');
});

test('theme toggles Auto → Light → Dark → Auto', () => {
  assert.equal(nextPreviewTheme('auto'), 'light');
  assert.equal(nextPreviewTheme('light'), 'dark');
  assert.equal(nextPreviewTheme('dark'), 'auto');
  assert.equal(nextPreviewTheme('nonsense'), 'auto');
});

function previewHtml(theme: PreviewTheme): string {
  const md = new MarkdownIt({ html: true });
  extendMarkdownIt(md, { isMermaidEnabled: () => true, addHeadingIds: false, previewTheme: () => theme });
  return md.render('# Title\n\nText');
}

test('preview gets a theme marker only when a theme is forced', () => {
  assert.doesNotMatch(previewHtml('auto'), /mdp-settings/);
  assert.match(previewHtml('dark'), /^<span class="mdp-settings" data-mdp-theme="dark" hidden><\/span>/);
  assert.match(previewHtml('light'), /^<span class="mdp-settings" data-mdp-theme="light" hidden><\/span>/);
});

test('exports never carry the preview theme marker', () => {
  const { html } = renderHtmlDocument('# Title', assets(), { mermaid: true });
  assert.doesNotMatch(mainContent(html), /mdp-settings/);
});
