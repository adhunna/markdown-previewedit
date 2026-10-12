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

const NAMED_COLORS: Record<string, string> = {
  black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00',
  orange: 'FFA500', purple: '800080', pink: 'FFC0CB', brown: 'A52A2A', gray: '808080', grey: '808080',
  navy: '000080', teal: '008080', maroon: '800000', olive: '808000', lime: '00FF00', aqua: '00FFFF',
  cyan: '00FFFF', magenta: 'FF00FF', fuchsia: 'FF00FF', silver: 'C0C0C0', gold: 'FFD700', indigo: '4B0082',
  violet: 'EE82EE', crimson: 'DC143C', coral: 'FF7F50', salmon: 'FA8072', tomato: 'FF6347', orchid: 'DA70D6',
  darkred: '8B0000', darkgreen: '006400', darkblue: '00008B', darkorange: 'FF8C00', lightgray: 'D3D3D3',
  lightgrey: 'D3D3D3', darkgray: 'A9A9A9', darkgrey: 'A9A9A9', lightblue: 'ADD8E6', lightgreen: '90EE90',
  lightyellow: 'FFFFE0', lightpink: 'FFB6C1',
};

/** `RRGGBB` for Word, or undefined for colours Word cannot use (transparent, unknown names). */
export function cssColorToHex(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) {
    return v.slice(1).toUpperCase();
  }
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return [...v.slice(1)].map((c) => c + c).join('').toUpperCase();
  }
  const fn = /^(rgb|hsl)a?\(([^)]*)\)$/.exec(v);
  if (fn) {
    const [a, b, c] = fn[2].split(',').map((part) => parseFloat(part));
    if ([a, b, c].some((n) => !Number.isFinite(n))) {
      return undefined;
    }
    const rgb = fn[1] === 'rgb' ? [a, b, c].map((n, i) => (fn[2].split(',')[i].includes('%') ? (n / 100) * 255 : n)) : hslToRgb(a, b / 100, c / 100);
    return rgb.map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return NAMED_COLORS[v];
}

function hslToRgb(h: number, s: number, l: number): number[] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Word font size in half-points for a safe CSS size, relative to an 11 pt body. */
export function cssSizeToHalfPoints(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)(em|rem|%|px)$/.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const n = parseFloat(match[1]);
  const points = match[2] === 'px' ? n * 0.75 : match[2] === '%' ? (n / 100) * 11 : n * 11;
  return Math.round(points * 2);
}
