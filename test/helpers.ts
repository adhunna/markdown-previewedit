import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ExportAssets } from '../src/export/html';

export const root = process.cwd();

export function sample(...parts: string[]): string {
  return readFileSync(join(root, 'samples', ...parts), 'utf8');
}

export function maliciousSamples(): { name: string; markdown: string }[] {
  return readdirSync(join(root, 'samples', 'malicious'))
    .filter((f) => f.endsWith('.md'))
    .map((name) => ({ name, markdown: sample('malicious', name) }));
}

export function assets(): ExportAssets {
  const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');
  return {
    exportCss: read('media', 'mdp-export.css'),
    previewCss: read('media', 'mdp-preview.css'),
    katexCss: read('dist', 'katex-inline.css'),
    mermaidJs: read('dist', 'preview', 'mermaid.js'),
  };
}

/** The rendered document body only (without the bundled Mermaid script). */
export function mainContent(html: string): string {
  const match = /<main class="markdown-body">([\s\S]*)<\/main>/.exec(html);
  if (!match) {
    throw new Error('No <main> in exported HTML');
  }
  return match[1];
}
