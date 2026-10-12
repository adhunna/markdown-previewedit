/** Pure helpers for preview settings (no VS Code API, so they are unit-testable). */

export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 40;

/** Next `markdown.preview.fontSize` value after one step up (+1) or down (-1), clamped. */
export function stepFontSize(current: number | undefined, delta: number): number {
  const base = Number.isFinite(current) ? Math.round(current as number) : DEFAULT_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, base + delta));
}

export type PreviewTheme = 'auto' | 'light' | 'dark';

export const PREVIEW_THEMES: readonly PreviewTheme[] = ['auto', 'light', 'dark'];

/** Auto → Light → Dark → Auto. */
export function nextPreviewTheme(current: string | undefined): PreviewTheme {
  const index = PREVIEW_THEMES.indexOf(current as PreviewTheme);
  return PREVIEW_THEMES[(index + 1) % PREVIEW_THEMES.length];
}

export function isPreviewTheme(value: unknown): value is PreviewTheme {
  return typeof value === 'string' && (PREVIEW_THEMES as readonly string[]).includes(value);
}
