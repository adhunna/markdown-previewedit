// Build script: bundles the extension (Node), the preview script (browser) and, with --tests,
// the test files. Also writes dist/katex-inline.css with KaTeX fonts embedded for exports.
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import * as esbuild from 'esbuild';

const args = new Set(process.argv.slice(2));
const production = args.has('--production');
const watch = args.has('--watch');
const tests = args.has('--tests');

async function writeKatexCss() {
  const dir = 'node_modules/katex/dist';
  let css = await readFile(join(dir, 'katex.min.css'), 'utf8');
  const fonts = new Map();
  for (const match of css.matchAll(/url\(fonts\/([\w-]+\.woff2)\)/g)) {
    if (!fonts.has(match[1])) {
      fonts.set(match[1], (await readFile(join(dir, 'fonts', match[1]))).toString('base64'));
    }
  }
  // Keep only the embedded woff2 source of each @font-face.
  css = css.replace(/src:url\(fonts\/([\w-]+\.woff2)\) format\("woff2"\)(?:,url\([^)]*\) format\("[^"]*"\))*/g, (_m, file) => `src:url(data:font/woff2;base64,${fonts.get(file)}) format("woff2")`);
  await mkdir('dist', { recursive: true });
  await writeFile('dist/katex-inline.css', css);
}

const extensionBuild = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: 'dist/extension.js',
  external: ['vscode', 'bufferutil', 'utf-8-validate'],
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
};

const previewBuild = {
  entryPoints: ['src/preview/mermaid.ts'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  outfile: 'dist/preview/mermaid.js',
  minify: true,
  logLevel: 'info',
};

await writeKatexCss();

if (watch) {
  const contexts = await Promise.all([esbuild.context(extensionBuild), esbuild.context(previewBuild)]);
  await Promise.all(contexts.map((c) => c.watch()));
} else {
  await Promise.all([esbuild.build(extensionBuild), esbuild.build(previewBuild)]);
}

if (tests) {
  await rm('test-output', { recursive: true, force: true });
  const entryPoints = (await readdir('test')).filter((f) => f.endsWith('.test.ts')).map((f) => join('test', f));
  await esbuild.build({
    entryPoints,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outdir: 'test-output',
    external: ['vscode', 'bufferutil', 'utf-8-validate'],
    sourcemap: true,
    logLevel: 'warning',
  });
}
