/*
 * Runs inside VS Code's Markdown preview (and inside exported HTML/PDF pages).
 * 1. Applies a forced Light/Dark preview theme (marker from src/markdown/previewTheme.ts).
 * 2. Finds the `.mdp-mermaid` placeholders written by src/markdown/mermaid.ts and renders them.
 */
import mermaid from 'mermaid';

declare global {
  interface Window {
    __mdpMermaidDone?: boolean;
  }
}

const svgCache = new Map<string, string>();
let renderCounter = 0;
let pending: Promise<void> = Promise.resolve();

const THEME_CLASSES = ['vscode-light', 'vscode-dark', 'vscode-high-contrast', 'vscode-high-contrast-light'];
/** Theme classes VS Code itself set on <body>; restored when the preview theme is Auto. */
let vscodeThemeClasses: string[] | undefined;
/** Theme classes as we last left them, to tell our own changes from VS Code's. */
let lastAppliedClasses: string | undefined;

function bodyThemeClasses(): string[] {
  return THEME_CLASSES.filter((c) => document.body.classList.contains(c));
}

/**
 * Swaps VS Code's body theme classes so the built-in styles, code highlighting, our CSS and
 * Mermaid all follow the forced theme. Only class names and a data attribute change.
 */
function applyPreviewTheme(): void {
  const body = document.body;
  const current = bodyThemeClasses();
  if (current.join(' ') !== lastAppliedClasses) {
    vscodeThemeClasses = current; // VS Code (re)set the theme since we last looked.
  }
  const forced = document.querySelector<HTMLElement>('.mdp-settings')?.dataset.mdpTheme;
  const target = forced === 'dark' ? ['vscode-dark'] : forced === 'light' ? ['vscode-light'] : (vscodeThemeClasses ?? current);
  if (forced === 'dark' || forced === 'light') {
    body.dataset.mdpTheme = forced;
  } else {
    delete body.dataset.mdpTheme;
  }
  if (target.join(' ') !== current.join(' ')) {
    body.classList.remove(...THEME_CLASSES);
    body.classList.add(...target);
  }
  lastAppliedClasses = bodyThemeClasses().join(' ');
}

function currentTheme(): 'dark' | 'default' {
  const classes = document.body.classList;
  const dark = classes.contains('vscode-dark') || (classes.contains('vscode-high-contrast') && !classes.contains('vscode-high-contrast-light'));
  return dark ? 'dark' : 'default';
}

async function renderOne(container: HTMLElement, theme: string): Promise<void> {
  const source = container.querySelector('.mdp-mermaid-source')?.textContent ?? '';
  const key = `${theme}\u0000${source}`;
  container.querySelector('.mdp-mermaid-output')?.remove();
  const output = document.createElement('div');
  output.className = 'mdp-mermaid-output';
  try {
    let svg = svgCache.get(key);
    if (svg === undefined) {
      const id = `mdp-mermaid-${renderCounter++}`;
      try {
        svg = (await mermaid.render(id, source)).svg;
      } finally {
        // Mermaid may leave its temporary render node (and error graphic) in <body>.
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      }
      svgCache.set(key, svg);
    }
    // Mermaid runs with securityLevel 'strict' and sanitizes its SVG output with DOMPurify.
    output.innerHTML = svg;
    container.classList.remove('mdp-mermaid-has-error');
  } catch (error) {
    const box = document.createElement('div');
    box.className = 'mdp-mermaid-error';
    box.textContent = `Mermaid diagram error: ${error instanceof Error ? error.message : String(error)}`;
    output.appendChild(box);
    container.classList.add('mdp-mermaid-has-error');
  }
  container.appendChild(output);
}

async function renderAll(): Promise<void> {
  applyPreviewTheme();
  const containers = Array.from(document.querySelectorAll<HTMLElement>('.mdp-mermaid'));
  if (containers.length > 0) {
    const theme = currentTheme();
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme, suppressErrorRendering: true });
    for (const container of containers) {
      await renderOne(container, theme);
    }
  }
  window.__mdpMermaidDone = true;
}

function scheduleRender(): void {
  // Serialize renders: mermaid.render is not safe to run concurrently.
  pending = pending.then(renderAll, renderAll);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleRender);
} else {
  scheduleRender();
}
window.addEventListener('vscode.markdown.updateContent', scheduleRender);
new MutationObserver(scheduleRender).observe(document.body, { attributes: true, attributeFilter: ['class'] });
