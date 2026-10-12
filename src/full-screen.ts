/**
 * A23 (partial): full-screen preview inside the VS Code window.
 * Pure planning of VS Code's own layout commands (no VS Code API, so it is unit-testable).
 */

/** Maximizes the active editor group (the preview) and hides both side bars, then the panel. */
export const ENTER_FULL_SCREEN = ['workbench.action.maximizeEditorHideSidebar', 'workbench.action.closePanel'] as const;

export interface FullScreenState {
  /** Another editor group was open, so entering maximized the preview's group. */
  maximizedGroup: boolean;
}

/** Commands that undo `ENTER_FULL_SCREEN`: restore the editor groups, then show the primary side bar. */
export function exitFullScreenCommands(state: FullScreenState): string[] {
  return [...(state.maximizedGroup ? ['workbench.action.toggleMaximizeEditorGroup'] : []), 'workbench.action.toggleSidebarVisibility'];
}

/** View type of VS Code's built-in Markdown preview tab, as seen through `vscode.window.tabGroups`. */
export function isMarkdownPreviewViewType(viewType: string): boolean {
  return viewType === 'markdown.preview' || viewType.endsWith('-markdown.preview');
}
