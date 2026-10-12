/*
 * Runs inside VS Code's Markdown preview (and inside exported HTML/PDF pages).
 * Finds the `.mdp-mermaid` placeholders written by src/markdown/mermaid.ts and renders them.
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
