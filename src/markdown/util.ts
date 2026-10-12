import type Token from 'markdown-it/lib/token.mjs';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain text of an inline token (formatting dropped), as used for heading slugs. */
export function inlineText(token: Token | undefined): string {
  if (!token?.children) {
    return token?.content ?? '';
  }
  return token.children
    .filter((child) => child.type === 'text' || child.type === 'code_inline' || child.type === 'emoji')
    .map((child) => child.content)
    .join('');
}

/**
 * Re-emits the scroll-sync attributes (`class="code-line" data-line="N"`) that VS Code's
 * preview adds to tokens, for renderers that build their own HTML.
 */
export function sourceLineAttrs(token: Token, extraClass: string): string {
  const classes = [extraClass, token.attrGet('class')].filter(Boolean).join(' ');
  const line = token.attrGet('data-line');
  return `class="${escapeHtml(classes)}"${line !== null ? ` data-line="${escapeHtml(line)}"` : ''}`;
}
