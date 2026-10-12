import { createExportMarkdownIt, parseFrontMatter } from '../export/engine';
import { sourceMapPlugin, type SourceMapEnv } from '../markdown/sourceMap';

/**
 * A24: HTML for the Edit Preview. Same syntax and sanitizer as HTML export, plus the source map
 * that lets the preview tell the extension which part of the file the user selected.
 */

export interface EditRenderOptions {
  readonly mermaid: boolean;
  /** Turns a relative image path into a URL the webview may load; return undefined to leave it. */
  readonly resolveImage?: (src: string) => string | undefined;
}

/** The Edit Preview works on LF line endings; offsets and line numbers refer to this text. */
export function normalizeSource(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/** Renders the whole document (front matter hidden); `source` must already be normalized. */
export function renderEditPreview(source: string, options: EditRenderOptions): string {
  const { body } = parseFrontMatter(source);
  const offset = source.length - body.length;
  const line = offset === 0 ? 0 : source.slice(0, offset).split('\n').length - 1;

  const md = createExportMarkdownIt({ mermaid: options.mermaid });
  sourceMapPlugin(md);
  const image = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet('src');
    if (src && options.resolveImage && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(src)) {
      const resolved = options.resolveImage(src);
      if (resolved) {
        token.attrSet('src', resolved);
      }
    }
    return image ? image(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
  };
  const env: SourceMapEnv = { mdpSourceBase: { offset, line } };
  return md.render(body, env);
}
