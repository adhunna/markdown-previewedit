import type MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import { escapeHtml, sourceLineAttrs } from './util';

const BOXES = ['note', 'tip', 'info', 'warning', 'danger'] as const;

/** `::: warning Optional title` boxes and `::: details Summary` collapsibles. */
export function containersPlugin(md: MarkdownIt): void {
  for (const name of BOXES) {
    md.use(container, name, {
      render(tokens: { [i: number]: import('markdown-it/lib/token.mjs').default }, idx: number) {
        const token = tokens[idx];
        if (token.nesting !== 1) {
          return '</div>\n';
        }
        const title = token.info.trim().slice(name.length).trim();
        const titleHtml = title ? `<p class="mdp-container-title">${escapeHtml(title)}</p>\n` : '';
        return `<div ${sourceLineAttrs(token, `mdp-container mdp-container-${name}`)}>\n${titleHtml}`;
      },
    });
  }

  md.use(container, 'details', {
    render(tokens: { [i: number]: import('markdown-it/lib/token.mjs').default }, idx: number) {
      const token = tokens[idx];
      if (token.nesting !== 1) {
        return '</details>\n';
      }
      const summary = token.info.trim().slice('details'.length).trim() || 'Details';
      return `<details ${sourceLineAttrs(token, 'mdp-details')}><summary>${escapeHtml(summary)}</summary>\n`;
    },
  });
}
