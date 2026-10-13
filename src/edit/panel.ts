import { randomBytes } from 'node:crypto';
import { basename, dirname } from 'node:path';
import * as vscode from 'vscode';
import { applyFormat, type FormatRequest, type Span } from './format';
import { isSafeLinkUrl, parseWebviewMessage } from './messages';
import { normalizeSource, renderEditPreview } from './render';
import type { PreviewTheme } from '../preview-settings';

/**
 * A24: the "Edit Preview" panel — a preview of one Markdown document where selected text can
 * be formatted from a toolbar. VS Code's built-in preview cannot send messages to extensions, so
 * this is our own webview (ADR-002). Edits go through `WorkspaceEdit`, so they are undoable.
 */

export interface EditPreviewSettings {
  mermaid(): boolean;
  theme(): PreviewTheme;
  fontSize(): number;
}

export class EditPreviewManager implements vscode.Disposable {
  private readonly panels = new Map<string, EditPreviewPanel>();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly settings: EditPreviewSettings,
    private readonly log: vscode.LogOutputChannel,
  ) {}

  open(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal();
      return;
    }
    const panel = new EditPreviewPanel(this.context, document, this.settings, this.log, () => this.panels.delete(key));
    this.panels.set(key, panel);
  }

  /** Settings that change how the preview looks (theme, font size, Mermaid). */
  refreshAll(): void {
    for (const panel of this.panels.values()) {
      panel.render();
    }
  }

  dispose(): void {
    for (const panel of [...this.panels.values()]) {
      panel.dispose();
    }
  }
}

class EditPreviewPanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  /** LF-normalized text the webview is currently showing, and its document version. */
  private source = '';
  private renderedVersion = -1;
  private pendingSelect: Span | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly document: vscode.TextDocument,
    private readonly settings: EditPreviewSettings,
    private readonly log: vscode.LogOutputChannel,
    private readonly onDispose: () => void,
  ) {
    const documentFolder = vscode.Uri.file(dirname(document.uri.fsPath));
    this.panel = vscode.window.createWebviewPanel(
      'previewEdit.editPreview',
      `Edit: ${basename(document.uri.fsPath)}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist'),
          vscode.Uri.joinPath(context.extensionUri, 'media'),
          ...(document.uri.scheme === 'file' ? [documentFolder] : []),
          ...(vscode.workspace.workspaceFolders ?? []).map((f) => f.uri),
        ],
      },
    );
    this.panel.webview.html = this.page();

    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.webview.onDidReceiveMessage((message: unknown) => void this.onMessage(message)),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === this.document) {
          this.scheduleRender();
        }
      }),
      vscode.workspace.onDidCloseTextDocument((closed) => {
        if (closed === this.document) {
          this.panel.dispose();
        }
      }),
    );
  }

  reveal(): void {
    this.panel.reveal(undefined, true);
  }

  private scheduleRender(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(), 150);
  }

  render(): void {
    if (this.disposed) {
      return;
    }
    const started = Date.now();
    this.source = normalizeSource(this.document.getText());
    this.renderedVersion = this.document.version;
    const folder = this.document.uri.scheme === 'file' ? vscode.Uri.file(dirname(this.document.uri.fsPath)) : undefined;
    const html = renderEditPreview(this.source, {
      mermaid: this.settings.mermaid(),
      resolveImage: (src) => {
        if (!folder) {
          return undefined;
        }
        const path = src.split(/[?#]/)[0];
        let decoded: string;
        try {
          decoded = decodeURIComponent(path);
        } catch {
          return undefined;
        }
        return this.panel.webview.asWebviewUri(vscode.Uri.joinPath(folder, decoded)).toString();
      },
    });
    void this.panel.webview.postMessage({
      type: 'update',
      html,
      version: this.renderedVersion,
      theme: this.settings.theme(),
      fontSize: this.settings.fontSize(),
      select: this.pendingSelect,
    });
    this.pendingSelect = undefined;
    this.log.debug(`Edit Preview rendered ${basename(this.document.uri.fsPath)} in ${Date.now() - started} ms`);
  }

  private async onMessage(raw: unknown): Promise<void> {
    const lineCount = this.source.split('\n').length;
    const message = parseWebviewMessage(raw, { length: this.source.length, lineCount });
    if (!message) {
      this.log.warn('Edit Preview: ignored an invalid message from the webview');
      return;
    }
    switch (message.type) {
      case 'ready':
        this.render();
        return;
      case 'reveal': {
        const position = new vscode.Position(message.line, 0);
        await vscode.window.showTextDocument(this.document, { viewColumn: this.sourceColumn(), selection: new vscode.Range(position, position) });
        return;
      }
      case 'link': {
        const url = await vscode.window.showInputBox({
          title: 'Link',
          prompt: 'Web address, mailto:, #heading or a relative path. Leave empty to remove the link.',
          value: message.current,
          validateInput: (value) => (value === '' || isSafeLinkUrl(value.trim()) ? undefined : 'Use an http(s) or mailto: address, a #heading or a relative path.'),
        });
        if (url === undefined) {
          return;
        }
        await this.format(message.version, { ...message.request, action: { kind: 'link', url: url.trim() } });
        return;
      }
      case 'format':
        await this.format(message.version, message.request);
        return;
    }
  }

  private async format(version: number, request: FormatRequest): Promise<void> {
    if (version !== this.document.version || version !== this.renderedVersion) {
      void vscode.window.showInformationMessage('The document changed while you were selecting. Please select the text again.');
      this.render();
      return;
    }
    const result = applyFormat(this.source, request);
    if (result.message || !result.edits.length) {
      if (result.message) {
        void vscode.window.showInformationMessage(result.message);
      }
      return;
    }
    const starts = lineStarts(this.source);
    const position = (offset: number) => {
      let line = starts.length - 1;
      while (line > 0 && starts[line] > offset) {
        line--;
      }
      return new vscode.Position(line, offset - starts[line]);
    };
    const edit = new vscode.WorkspaceEdit();
    for (const e of result.edits) {
      // Inserted line breaks follow the document's own line endings.
      const text = this.document.eol === vscode.EndOfLine.CRLF ? e.text.replace(/\n/g, '\r\n') : e.text;
      edit.replace(this.document.uri, new vscode.Range(position(e.start), position(e.end)), text);
    }
    this.pendingSelect = result.select;
    if (!(await vscode.workspace.applyEdit(edit))) {
      this.pendingSelect = undefined;
      void vscode.window.showWarningMessage('Could not change the document (is it read-only?).');
    }
  }

  /** The column of a visible editor showing this document, if any. */
  private sourceColumn(): vscode.ViewColumn | undefined {
    return vscode.window.visibleTextEditors.find((e) => e.document === this.document)?.viewColumn;
  }

  private page(): string {
    const webview = this.panel.webview;
    const nonce = randomBytes(16).toString('base64');
    const asset = (...parts: string[]) => webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, ...parts)).toString();
    const csp = [
      "default-src 'none'",
      `script-src 'nonce-${nonce}'`,
      // Inline styles are needed by KaTeX and by the colour/size spans (values limited by styles.ts).
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource} data:`,
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${asset('dist', 'katex-inline.css')}">
<link rel="stylesheet" href="${asset('media', 'mdp-preview.css')}">
<link rel="stylesheet" href="${asset('media', 'mdp-edit.css')}">
<title>Edit Preview</title>
</head>
<body>
<main id="mdp-content" class="markdown-body"></main>
<script nonce="${nonce}" src="${asset('dist', 'preview', 'mermaid.js')}"></script>
<script nonce="${nonce}" src="${asset('dist', 'edit', 'toolbar.js')}"></script>
</body>
</html>`;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    clearTimeout(this.timer);
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.onDispose();
  }
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) {
    starts.push(i + 1);
  }
  return starts;
}
