import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import puppeteer from 'puppeteer-core';
import { findBrowser } from '../src/export/browser';
import { root } from './helpers';

const browserPath = findBrowser(process.env.MDP_TEST_BROWSER);
const skip = browserPath ? false : 'no Edge/Chrome/Chromium found (set MDP_TEST_BROWSER)';

/** Loads a page shaped like VS Code's preview, runs the preview script, returns body state. */
async function run(bodyClass: string, marker: string, after?: string) {
  const browser = await puppeteer.launch({
    executablePath: browserPath!,
    args: process.getuid?.() === 0 || process.env.CI ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    const css = readFileSync(join(root, 'media', 'mdp-preview.css'), 'utf8');
    await page.setContent(`<html style="--vscode-editor-background:#fefefe"><head><style>body{background-color:var(--vscode-editor-background)}${css}</style></head>
      <body class="vscode-body ${bodyClass}">${marker}<p>Text</p></body></html>`);
    await page.addScriptTag({ content: readFileSync(join(root, 'dist', 'preview', 'mermaid.js'), 'utf8') });
    await page.waitForFunction('window.__mdpMermaidDone === true');
    if (after !== undefined) {
      // Simulate a live update that changes the theme setting.
      await page.evaluate((html) => {
        window.__mdpMermaidDone = false;
        document.querySelector('.mdp-settings')?.remove();
        document.body.insertAdjacentHTML('afterbegin', html);
        window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent'));
      }, after);
      await page.waitForFunction('window.__mdpMermaidDone === true');
    }
    return await page.evaluate(() => ({
      classes: document.body.className,
      theme: document.body.dataset.mdpTheme ?? null,
      background: getComputedStyle(document.body).backgroundColor,
    }));
  } finally {
    await browser.close();
  }
}

const DARK = '<span class="mdp-settings" data-mdp-theme="dark" hidden></span>';
const LIGHT = '<span class="mdp-settings" data-mdp-theme="light" hidden></span>';

test('forced Dark turns a light VS Code preview dark', { skip }, async () => {
  const state = await run('vscode-light', DARK);
  assert.match(state.classes, /\bvscode-dark\b/);
  assert.doesNotMatch(state.classes, /\bvscode-light\b/);
  assert.equal(state.theme, 'dark');
  assert.equal(state.background, 'rgb(31, 31, 31)');
});

test('forced Light turns a dark VS Code preview light', { skip }, async () => {
  const state = await run('vscode-dark', LIGHT);
  assert.match(state.classes, /\bvscode-light\b/);
  assert.equal(state.background, 'rgb(255, 255, 255)');
});

test('switching back to Auto restores the VS Code theme', { skip }, async () => {
  const state = await run('vscode-light', DARK, '');
  assert.match(state.classes, /\bvscode-light\b/);
  assert.doesNotMatch(state.classes, /\bvscode-dark\b/);
  assert.equal(state.theme, null);
  assert.equal(state.background, 'rgb(254, 254, 254)', 'VS Code theme colour is used again');
});
