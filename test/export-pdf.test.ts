import assert from 'node:assert/strict';
import { test } from 'node:test';
import { candidatePaths, findBrowser } from '../src/export/browser';
import { renderHtmlDocument } from '../src/export/html';
import { renderPdf } from '../src/export/pdf';
import { assets, sample } from './helpers';

test('Edge is preferred on Windows', () => {
  const paths = candidatePaths({ PROGRAMFILES: 'C:\\Program Files', 'PROGRAMFILES(X86)': 'C:\\Program Files (x86)' }, 'win32');
  assert.match(paths[0], /Microsoft[\\/]Edge[\\/]Application[\\/]msedge\.exe$/);
  assert.ok(paths.some((p) => /chrome\.exe$/.test(p)));
});

const browser = findBrowser(process.env.MDP_TEST_BROWSER);

test('PDF export renders the feature tour, including the Mermaid diagram', { skip: browser ? false : 'no Edge/Chrome/Chromium found (set MDP_TEST_BROWSER)' }, async () => {
  const { html, hasMermaid } = renderHtmlDocument(sample('features', 'all.md'), assets(), { mermaid: true });
  const pdf = await renderPdf(html, { browserPath: browser!, format: 'A4', margin: '20mm', waitForMermaid: hasMermaid, timeoutMs: 60_000,
    // Chromium's sandbox is unavailable as root in containers and on some CI runners.
    extraArgs: process.getuid?.() === 0 || process.env.CI ? ['--no-sandbox'] : [],
  });
  assert.equal(Buffer.from(pdf.subarray(0, 5)).toString('latin1'), '%PDF-');
  assert.ok(pdf.length > 10_000);
});
