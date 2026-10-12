import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import * as vscode from 'vscode';
import type MarkdownIt from 'markdown-it';
import { findBrowser } from './export/browser';
import { renderDocx } from './export/docx';
import { renderHtmlDocument, type ExportAssets } from './export/html';
import { renderPdf, type PdfOptions } from './export/pdf';
import { extendMarkdownIt } from './markdown/plugins';
import { ENTER_FULL_SCREEN, exitFullScreenCommands, isMarkdownPreviewViewType, type FullScreenState } from './full-screen';
import { isPreviewTheme, nextPreviewTheme, stepFontSize, type PreviewTheme } from './preview-settings';

type ExportKind = 'docx' | 'pdf' | 'html';

const FILTERS: Record<ExportKind, Record<string, string[]>> = {
  docx: { 'Word document': ['docx'] },
  pdf: { 'PDF document': ['pdf'] },
  html: { 'HTML page': ['html'] },
};

let log: vscode.LogOutputChannel;

/** Set while the preview is in full-screen mode (mirrored to the `mdp.previewFullScreen` context key). */
let fullScreen: FullScreenState | undefined;

export function activate(context: vscode.ExtensionContext) {
  log = vscode.window.createOutputChannel('MarkDownPreview', { log: true });
  context.subscriptions.push(log);

  for (const kind of ['docx', 'pdf', 'html'] as const) {
    const command = `mdp.export${kind === 'docx' ? 'Docx' : kind === 'pdf' ? 'Pdf' : 'Html'}`;
    context.subscriptions.push(vscode.commands.registerCommand(command, (uri?: vscode.Uri) => exportDocument(context, kind, uri)));
  }

  context.subscriptions.push(
    // A01: our own title-bar button, because VS Code hides its built-in one in some setups.
    vscode.commands.registerCommand('mdp.openPreviewToSide', (uri?: vscode.Uri) => vscode.commands.executeCommand('markdown.showPreviewToSide', uri)),
    vscode.commands.registerCommand('mdp.preview.increaseFontSize', () => changeFontSize(1)),
    vscode.commands.registerCommand('mdp.preview.decreaseFontSize', () => changeFontSize(-1)),
    vscode.commands.registerCommand('mdp.preview.resetFontSize', () => changeFontSize(0)),
    vscode.commands.registerCommand('mdp.preview.toggleTheme', toggleTheme),
    vscode.commands.registerCommand('mdp.preview.toggleFullScreen', () => (fullScreen ? exitFullScreen() : enterFullScreen())),
    vscode.commands.registerCommand('mdp.preview.exitFullScreen', exitFullScreen),
    // If the last preview is closed while full screen, put the side bar back and reset the button.
    vscode.window.tabGroups.onDidChangeTabs(() => {
      if (fullScreen && !hasMarkdownPreviewTab()) {
        fullScreen = undefined;
        void runCommands(['workbench.action.toggleSidebarVisibility']);
        void setFullScreenContext(false);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mdp.mermaid.enabled') || event.affectsConfiguration('mdp.preview.theme')) {
        void vscode.commands.executeCommand('markdown.preview.refresh');
      }
    }),
  );

  // Contributed to VS Code's built-in Markdown preview (package.json: "markdown.markdownItPlugins").
  return {
    extendMarkdownIt(md: MarkdownIt): MarkdownIt {
      return extendMarkdownIt(md, {
        isMermaidEnabled: () => vscode.workspace.getConfiguration('mdp').get<boolean>('mermaid.enabled', true),
        addHeadingIds: false,
        previewTheme: currentPreviewTheme,
      });
    },
  };
}

function currentPreviewTheme(): PreviewTheme {
  const value = vscode.workspace.getConfiguration('mdp').get<string>('preview.theme', 'auto');
  return isPreviewTheme(value) ? value : 'auto';
}

/** Steps VS Code's own `markdown.preview.fontSize` (User settings); 0 resets to the default. */
async function changeFontSize(delta: number): Promise<void> {
  const config = vscode.workspace.getConfiguration('markdown.preview');
  if (delta === 0) {
    await config.update('fontSize', undefined, vscode.ConfigurationTarget.Global);
    vscode.window.setStatusBarMessage('Markdown preview font size reset', 2000);
    return;
  }
  const size = stepFontSize(config.get<number>('fontSize'), delta);
  await config.update('fontSize', size, vscode.ConfigurationTarget.Global);
  vscode.window.setStatusBarMessage(`Markdown preview font size: ${size}px`, 2000);
}

async function toggleTheme(): Promise<void> {
  const next = nextPreviewTheme(currentPreviewTheme());
  await vscode.workspace.getConfiguration('mdp').update('preview.theme', next, vscode.ConfigurationTarget.Global);
  const label = { auto: 'Auto (follows VS Code)', light: 'Light', dark: 'Dark' }[next];
  vscode.window.setStatusBarMessage(`Markdown preview theme: ${label}`, 3000);
}

async function enterFullScreen(): Promise<void> {
  fullScreen = { maximizedGroup: vscode.window.tabGroups.all.length > 1 };
  await runCommands(ENTER_FULL_SCREEN);
  await setFullScreenContext(true);
}

async function exitFullScreen(): Promise<void> {
  if (!fullScreen) {
    return;
  }
  const state = fullScreen;
  fullScreen = undefined;
  await runCommands(exitFullScreenCommands(state));
  await setFullScreenContext(false);
}

/** Runs VS Code layout commands in order; one that does not apply to the current layout is logged and skipped. */
async function runCommands(commands: readonly string[]): Promise<void> {
  for (const command of commands) {
    try {
      await vscode.commands.executeCommand(command);
    } catch (error) {
      log.warn(`Layout command ${command} failed: ${String(error)}`);
    }
  }
}

function setFullScreenContext(value: boolean): Thenable<unknown> {
  return vscode.commands.executeCommand('setContext', 'mdp.previewFullScreen', value);
}

function hasMarkdownPreviewTab(): boolean {
  return vscode.window.tabGroups.all.some((group) =>
    group.tabs.some((tab) => tab.input instanceof vscode.TabInputWebview && isMarkdownPreviewViewType(tab.input.viewType)),
  );
}

export function deactivate(): void {
  // Nothing to clean up: all resources are registered in context.subscriptions.
}

async function exportDocument(context: vscode.ExtensionContext, kind: ExportKind, uri?: vscode.Uri): Promise<void> {
  try {
    const document = await resolveDocument(uri);
    if (!document) {
      void vscode.window.showWarningMessage('Open a Markdown file to export it.');
      return;
    }
    if (document.uri.scheme !== 'file') {
      void vscode.window.showWarningMessage('Export works for Markdown files saved on disk.');
      return;
    }
    if (kind === 'pdf' && !vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage('PDF export starts a local browser, so it is disabled in Restricted Mode. Trust this workspace to use it.');
      return;
    }

    const sourcePath = document.uri.fsPath;
    const defaultTarget = join(dirname(sourcePath), `${basename(sourcePath, extname(sourcePath))}.${kind}`);
    const target = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(defaultTarget), filters: FILTERS[kind], title: `Export to ${kind.toUpperCase()}` });
    if (!target) {
      return;
    }

    const config = vscode.workspace.getConfiguration('mdp', document.uri);
    const started = Date.now();
    const bytes = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Exporting ${basename(sourcePath)} to ${kind.toUpperCase()}…` },
      () => produce(context, kind, document.getText(), dirname(sourcePath), config),
    );
    if (!bytes) {
      return;
    }
    await vscode.workspace.fs.writeFile(target, bytes);
    log.info(`Exported ${sourcePath} → ${target.fsPath} in ${Date.now() - started} ms`);

    if (config.get<boolean>('export.openAfterExport', true)) {
      await vscode.env.openExternal(target);
    } else {
      void vscode.window.showInformationMessage(`Exported to ${target.fsPath}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Export to ${kind} failed: ${message}`);
    void vscode.window.showErrorMessage(`Export failed: ${message}`, 'Show Log').then((choice) => {
      if (choice) {
        log.show();
      }
    });
  }
}

async function produce(context: vscode.ExtensionContext, kind: ExportKind, markdown: string, baseDir: string, config: vscode.WorkspaceConfiguration): Promise<Uint8Array | undefined> {
  if (kind === 'docx') {
    return renderDocx(markdown);
  }

  const mermaid = config.get<boolean>('mermaid.enabled', true);
  const { html, hasMermaid } = renderHtmlDocument(markdown, await loadAssets(context), { mermaid, baseDir });
  if (kind === 'html') {
    return new TextEncoder().encode(html);
  }

  const browserPath = findBrowser(config.get<string>('export.browserPath') || undefined);
  if (!browserPath) {
    const choice = await vscode.window.showErrorMessage(
      'PDF export needs Microsoft Edge, Google Chrome or Chromium. None was found — set "mdp.export.browserPath" to your browser.',
      'Open Settings',
    );
    if (choice) {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'mdp.export.browserPath');
    }
    return undefined;
  }
  log.info(`PDF export using ${browserPath}`);
  return renderPdf(html, {
    browserPath,
    format: config.get<PdfOptions['format']>('export.pdf.format', 'A4'),
    margin: config.get<string>('export.pdf.margin', '20mm'),
    waitForMermaid: hasMermaid,
  });
}

async function resolveDocument(uri?: vscode.Uri): Promise<vscode.TextDocument | undefined> {
  if (uri instanceof vscode.Uri) {
    return vscode.workspace.openTextDocument(uri);
  }
  const editor = vscode.window.activeTextEditor;
  if (editor?.document.languageId === 'markdown') {
    return editor.document;
  }
  return undefined;
}

let assets: Promise<ExportAssets> | undefined;

function loadAssets(context: vscode.ExtensionContext): Promise<ExportAssets> {
  const read = (...parts: string[]) => readFile(join(context.extensionPath, ...parts), 'utf8');
  assets ??= Promise.all([read('media', 'mdp-export.css'), read('media', 'mdp-preview.css'), read('dist', 'katex-inline.css'), read('dist', 'preview', 'mermaid.js')]).then(
    ([exportCss, previewCss, katexCss, mermaidJs]) => ({ exportCss, previewCss, katexCss, mermaidJs }),
  );
  return assets;
}
