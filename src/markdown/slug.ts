/**
 * GitHub-style heading slugs, matching the ids VS Code's built-in preview gives headings,
 * so `[TOC]` links work in the preview and in exports.
 */
export function slugify(text: string): string {
  return encodeURI(
    text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[\][!/'"#$%&()*+,./:;<=>?@\\^{|}~`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '')
      .replace(/^-+/, '')
      .replace(/-+$/, ''),
  );
}

/** Hands out unique slugs for one document (`a`, `a-1`, `a-2`, …). */
export class SlugCounter {
  private readonly seen = new Map<string, number>();

  next(text: string): string {
    const base = slugify(text);
    const count = this.seen.get(base);
    if (count === undefined) {
      this.seen.set(base, 0);
      return base;
    }
    this.seen.set(base, count + 1);
    return `${base}-${count + 1}`;
  }
}
