import type MarkdownIt from 'markdown-it';
import { escapeHtml, sourceLineAttrs } from './util';

/**
 * Turns ```mermaid fences into placeholders that the preview script (src/preview/mermaid.ts)
 * renders into diagrams. The source stays in the page as escaped text, never as HTML.
 */
export function mermaidPlugin(md: MarkdownIt, options: { isEnabled: () => boolean }): void {
  const original = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase();
    if (lang === 'mermaid' && options.isEnabled()) {
      return `<div ${sourceLineAttrs(token, 'mdp-mermaid')}><pre class="mdp-mermaid-source">${escapeHtml(token.content)}</pre></div>\n`;
    }
    return original ? original(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
}
