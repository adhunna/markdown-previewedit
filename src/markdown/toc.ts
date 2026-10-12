import type MarkdownIt from 'markdown-it';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import { SlugCounter } from './slug';
import { escapeHtml, inlineText, sourceLineAttrs } from './util';

export interface TocHeading {
  readonly level: number;
  readonly text: string;
  readonly slug: string;
}

const TOC_MARKER = /^\s*\[toc\]\s*$/i;
const TOC_COMMENT = /^\s*<!--\s*toc\s*-->\s*$/i;

/**
 * Replaces a `[TOC]` paragraph (or `<!-- toc -->` line) with a table of contents of the
 * document's headings. With `addHeadingIds`, also writes `id` attributes on headings (exports
 * need this; VS Code's preview adds its own ids).
 */
export function tocPlugin(md: MarkdownIt, options: { addHeadingIds: boolean }): void {
  md.core.ruler.push('mdp_toc', (state: StateCore) => {
    const tokens = state.tokens;
    const slugs = new SlugCounter();
    const headings: TocHeading[] = [];
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'heading_open') {
        const text = inlineText(tokens[i + 1]);
        const slug = slugs.next(text);
        headings.push({ level: Number(tokens[i].tag.slice(1)), text, slug });
        if (options.addHeadingIds) {
          tokens[i].attrSet('id', slug);
        }
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const isMarkerParagraph =
        token.type === 'paragraph_open' && tokens[i + 1]?.type === 'inline' && TOC_MARKER.test(tokens[i + 1].content) && tokens[i + 2]?.type === 'paragraph_close';
      const isMarkerComment = token.type === 'html_block' && TOC_COMMENT.test(token.content);
      if (!isMarkerParagraph && !isMarkerComment) {
        continue;
      }
      const toc = new state.Token('mdp_toc', 'nav', 0);
      toc.block = true;
      toc.map = token.map;
      toc.meta = { headings };
      tokens.splice(i, isMarkerParagraph ? 3 : 1, toc);
    }
  });

  md.renderer.rules.mdp_toc = (tokens, idx) => {
    const token = tokens[idx];
    const headings = (token.meta as { headings: TocHeading[] }).headings;
    if (headings.length === 0) {
      return '';
    }
    const minLevel = Math.min(...headings.map((h) => h.level));
    const items = headings
      .map((h) => `<li class="mdp-toc-level-${h.level - minLevel + 1}"><a href="#${escapeHtml(h.slug)}">${escapeHtml(h.text)}</a></li>`)
      .join('');
    return `<nav ${sourceLineAttrs(token, 'mdp-toc')}><ul>${items}</ul></nav>\n`;
  };
}
