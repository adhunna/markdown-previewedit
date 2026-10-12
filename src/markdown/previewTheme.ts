import type MarkdownIt from 'markdown-it';
import type { PreviewTheme } from '../preview-settings';

/**
 * Tells the preview script which theme to force. When the theme is not `auto`, the rendered
 * document starts with an empty, hidden marker element; the script reads `data-mdp-theme`.
 * Preview only — exports never register this plugin.
 */
export function previewThemePlugin(md: MarkdownIt, options: { theme: () => PreviewTheme }): void {
  md.core.ruler.push('mdp_preview_theme', (state) => {
    const theme = options.theme();
    if (theme === 'auto') {
      return;
    }
    const marker = new state.Token('mdp_preview_theme', 'span', 0);
    marker.meta = { theme };
    state.tokens.unshift(marker);
  });

  md.renderer.rules.mdp_preview_theme = (tokens, idx) => {
    const theme = (tokens[idx].meta as { theme: PreviewTheme }).theme === 'dark' ? 'dark' : 'light';
    return `<span class="mdp-settings" data-mdp-theme="${theme}" hidden></span>`;
  };
}
