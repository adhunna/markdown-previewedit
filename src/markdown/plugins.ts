import type MarkdownIt from 'markdown-it';
import abbr from 'markdown-it-abbr';
import deflist from 'markdown-it-deflist';
import { full as emoji } from 'markdown-it-emoji';
import footnote from 'markdown-it-footnote';
import githubAlerts from 'markdown-it-github-alerts';
import ins from 'markdown-it-ins';
import mark from 'markdown-it-mark';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import { containersPlugin } from './containers';
import { mermaidPlugin } from './mermaid';
import { previewThemePlugin } from './previewTheme';
import { taskListPlugin } from './tasklists';
import { tocPlugin } from './toc';
import { escapeHtml, sourceLineAttrs } from './util';
import type { PreviewTheme } from '../preview-settings';

export interface MdpPluginOptions {
  /** Read at render time so toggling the setting only needs a preview refresh. */
  readonly isMermaidEnabled: () => boolean;
  /** Exports need heading ids; VS Code's preview adds its own. */
  readonly addHeadingIds: boolean;
  /** Preview only: forced Light/Dark theme (read at render time). Exports leave this out. */
  readonly previewTheme?: () => PreviewTheme;
}

/** Everything this extension adds to markdown-it — shared by the preview and all exports. */
export function extendMarkdownIt(md: MarkdownIt, options: MdpPluginOptions): MarkdownIt {
  md.use(footnote)
    .use(deflist)
    .use(abbr)
    .use(sub)
    .use(sup)
    .use(mark)
    .use(ins)
    .use(emoji)
    .use(githubAlerts);

  // Keep scroll sync for alerts: the plugin's renderer ignores the source-line attributes.
  md.renderer.rules.alert_open = (tokens, idx) => {
    const token = tokens[idx];
    const { title, type } = token.meta as { title: string; type: string };
    return `<div ${sourceLineAttrs(token, `markdown-alert markdown-alert-${type}`)}><p class="markdown-alert-title">${escapeHtml(title)}</p>\n`;
  };

  containersPlugin(md);
  taskListPlugin(md);
  mermaidPlugin(md, { isEnabled: options.isMermaidEnabled });
  tocPlugin(md, { addHeadingIds: options.addHeadingIds });
  if (options.previewTheme) {
    previewThemePlugin(md, { theme: options.previewTheme });
  }
  return md;
}
