import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENTER_FULL_SCREEN, exitFullScreenCommands, isMarkdownPreviewViewType } from '../src/full-screen';

test('full screen maximizes the preview group and hides side bars and panel', () => {
  assert.deepEqual([...ENTER_FULL_SCREEN], ['workbench.action.maximizeEditorHideSidebar', 'workbench.action.closePanel']);
});

test('leaving full screen restores the editor groups only if they were maximized', () => {
  assert.deepEqual(exitFullScreenCommands({ maximizedGroup: true }), ['workbench.action.toggleMaximizeEditorGroup', 'workbench.action.toggleSidebarVisibility']);
  assert.deepEqual(exitFullScreenCommands({ maximizedGroup: false }), ['workbench.action.toggleSidebarVisibility']);
});

test('recognises the built-in Markdown preview tab', () => {
  assert.equal(isMarkdownPreviewViewType('mainThreadWebview-markdown.preview'), true);
  assert.equal(isMarkdownPreviewViewType('markdown.preview'), true);
  assert.equal(isMarkdownPreviewViewType('mainThreadWebview-markdown.preview.other'), false);
  assert.equal(isMarkdownPreviewViewType('mainThreadWebview-someone.else'), false);
});
