/**
 * The only inline CSS this extension writes or keeps (A24): text colour, background colour and
 * font size on `<span style="…">`. Everything else in a `style` attribute is dropped, so a document
 * cannot use CSS to overlay the page, load URLs or hide content.
 */

export type StyleProperty = 'color' | 'background-color' | 'font-size';

export const STYLE_PROPERTIES: readonly StyleProperty[] = ['color', 'background-color', 'font-size'];

/** `#rgb`, `#rrggbb`, `rgb()/rgba()/hsl()/hsla()` with plain numbers, or a colour keyword. */
export const SAFE_COLOR = /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|(?:rgb|hsl)a?\(\s*\d{1,3}(?:\.\d+)?%?\s*,\s*\d{1,3}(?:\.\d+)?%?\s*,\s*\d{1,3}(?:\.\d+)?%?\s*(?:,\s*(?:0|1|0?\.\d{1,3})\s*)?\)|[a-zA-Z]{3,20})$/;

/** A number with an em, rem, % or px unit (range checked in `isSafeStyleValue`). */
export const SAFE_FONT_SIZE = /^\d{1,3}(?:\.\d{1,2})?(?:em|rem|%|px)$/;

const SIZE_LIMITS: Record<string, [number, number]> = { em: [0.5, 3], rem: [0.5, 3], '%': [50, 300], px: [8, 48] };

export function isSafeStyleValue(property: StyleProperty, value: string): boolean {
  if (property !== 'font-size') {
    return SAFE_COLOR.test(value);
  }
  if (!SAFE_FONT_SIZE.test(value)) {
    return false;
  }
  const unit = /(em|rem|%|px)$/.exec(value)?.[1] ?? '';
  const [min, max] = SIZE_LIMITS[unit];
  const size = parseFloat(value);
  return size >= min && size <= max;
}

/** Parses a `style` attribute, keeping only safe declarations (later ones win). */
export function parseSafeStyle(style: string): Map<StyleProperty, string> {
  const result = new Map<StyleProperty, string>();
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) {
      continue;
    }
    const property = declaration.slice(0, colon).trim().toLowerCase() as StyleProperty;
    const value = declaration.slice(colon + 1).trim();
    if (STYLE_PROPERTIES.includes(property) && isSafeStyleValue(property, value)) {
      result.set(property, value);
    }
  }
  return result;
}

export function formatStyle(style: Map<StyleProperty, string>): string {
  return STYLE_PROPERTIES.filter((p) => style.has(p))
    .map((p) => `${p}:${style.get(p)}`)
    .join('; ');
}

/** An inline `<span style="…">` opening tag as written in Markdown source. */
export const STYLED_SPAN_OPEN = /^<span\s+style\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')\s*>$/i;
