import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyFormat, type BlockLines, type FormatAction, type FormatRequest, type Span } from '../src/edit/format';

/** Applies the edits (they never overlap) and returns the new text. */
function apply(source: string, request: FormatRequest): string {
  const { edits } = applyFormat(source, request);
  let out = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return out;
}

/** The source range of `text` (the n-th occurrence). */
function at(source: string, text: string, nth = 0): Span {
  let start = -1;
  for (let i = 0; i <= nth; i++) {
    start = source.indexOf(text, start + 1);
  }
  assert.notEqual(start, -1, `${text} not in source`);
  return { start, end: start + text.length };
}

function req(action: FormatAction, groups: Span[][], extra: Partial<FormatRequest> = {}): FormatRequest {
  return { action, groups, blocks: [], ...extra };
}

const block = (start: number, end: number, type = 'paragraph'): BlockLines => ({ start, end, type });

test('inline marks wrap the selected text, trimming surrounding spaces', () => {
  const s = 'Hello brave world';
  assert.equal(apply(s, req({ kind: 'mark', mark: 'bold' }, [[at(s, ' brave ')]])), 'Hello **brave** world');
  assert.equal(apply(s, req({ kind: 'mark', mark: 'italic' }, [[at(s, 'brave')]])), 'Hello *brave* world');
  assert.equal(apply(s, req({ kind: 'mark', mark: 'strike' }, [[at(s, 'brave')]])), 'Hello ~~brave~~ world');
  assert.equal(apply(s, req({ kind: 'mark', mark: 'highlight' }, [[at(s, 'brave')]])), 'Hello ==brave== world');
  assert.equal(apply(s, req({ kind: 'mark', mark: 'underline' }, [[at(s, 'brave')]])), 'Hello ++brave++ world');
  assert.equal(apply(s, req({ kind: 'mark', mark: 'code' }, [[at(s, 'brave')]])), 'Hello `brave` world');
  assert.equal(apply(s, req({ kind: 'mark', mark: 'sup' }, [[at(s, 'brave world')]])), 'Hello ^brave\\ world^');
});

test('marks toggle off when the selection is already formatted', () => {
  const bold = 'A **bold** b';
  assert.equal(apply(bold, req({ kind: 'mark', mark: 'bold' }, [[at(bold, 'bold')]], { active: at(bold, 'bold') })), 'A bold b');
  const both = 'A ***both*** b';
  assert.equal(apply(both, req({ kind: 'mark', mark: 'bold' }, [], { active: at(both, 'both') })), 'A *both* b');
  assert.equal(apply(both, req({ kind: 'mark', mark: 'italic' }, [], { active: at(both, 'both') })), 'A **both** b');
  const under = 'A __bold__ b';
  assert.equal(apply(under, req({ kind: 'mark', mark: 'bold' }, [], { active: at(under, 'bold') })), 'A bold b');
  const code = 'A ``x ` y`` b';
  assert.equal(apply(code, req({ kind: 'mark', mark: 'code' }, [], { active: at(code, 'x ` y') })), 'A x ` y b');
  const sub = 'H~2\\ x~O';
  assert.equal(apply(sub, req({ kind: 'mark', mark: 'sub' }, [], { active: at(sub, '2\\ x') })), 'H2 xO');
});

test('code wraps text containing backticks with a longer fence', () => {
  const s = 'Use a`b here';
  assert.equal(apply(s, req({ kind: 'mark', mark: 'code' }, [[at(s, 'a`b')]])), 'Use `` a`b `` here');
});

test('bold across already-bold pieces merges into one', () => {
  const s = 'one **two** three';
  const groups = [[at(s, 'one '), at(s, 'two'), at(s, ' three')]];
  assert.equal(apply(s, req({ kind: 'mark', mark: 'bold' }, groups)), '**one two three**');
});

test('a selection over two paragraphs is formatted per paragraph', () => {
  const s = 'First para\n\nSecond para';
  assert.equal(apply(s, req({ kind: 'mark', mark: 'bold' }, [[at(s, 'para')], [at(s, 'Second')]])), 'First **para**\n\n**Second** para');
});

test('links are added, changed and removed', () => {
  const s = 'See docs here';
  assert.equal(apply(s, req({ kind: 'link', url: 'https://x.dev/a b' }, [[at(s, 'docs')]])), 'See [docs](<https://x.dev/a b>) here');
  const l = 'See [docs](https://old) here';
  assert.equal(apply(l, req({ kind: 'link', url: 'https://new' }, [], { active: at(l, 'docs') })), 'See [docs](https://new) here');
  assert.equal(apply(l, req({ kind: 'link', url: '' }, [], { active: at(l, 'docs') })), 'See docs here');
});

test('colour, background and size are written as one HTML span and merged', () => {
  const s = 'Make it red now';
  const red = apply(s, req({ kind: 'style', property: 'color', value: '#d1242f' }, [[at(s, 'red')]]));
  assert.equal(red, 'Make it <span style="color:#d1242f">red</span> now');
  const bigger = apply(red, req({ kind: 'style', property: 'font-size', value: '1.25em' }, [], { active: at(red, 'red') }));
  assert.equal(bigger, 'Make it <span style="color:#d1242f; font-size:1.25em">red</span> now');
  const noColour = apply(bigger, req({ kind: 'style', property: 'color', value: null }, [], { active: at(bigger, 'red') }));
  assert.equal(noColour, 'Make it <span style="font-size:1.25em">red</span> now');
  const plain = apply(noColour, req({ kind: 'style', property: 'font-size', value: null }, [], { active: at(noColour, 'red') }));
  assert.equal(plain, s);
});

test('case changes touch only the text, never markup or URLs', () => {
  const s = 'the [quick brown](https://Example.com) fox';
  const groups = [[at(s, 'the '), at(s, 'quick brown'), at(s, ' fox')]];
  assert.equal(apply(s, req({ kind: 'case', mode: 'upper' }, groups)), 'THE [QUICK BROWN](https://Example.com) FOX');
  assert.equal(apply(s, req({ kind: 'case', mode: 'title' }, groups)), 'The [Quick Brown](https://Example.com) Fox');
  const loud = 'HELLO THERE. BYE';
  assert.equal(apply(loud, req({ kind: 'case', mode: 'sentence' }, [[at(loud, loud)]])), 'Hello there. bye');
  assert.equal(apply(loud, req({ kind: 'case', mode: 'lower' }, [[at(loud, loud)]])), 'hello there. bye');
});

test('clear formatting removes marks, spans and links but keeps the text', () => {
  const s = 'A **bold** and <span style="color:red">red</span> [link](https://x) end';
  const groups = [[at(s, 'A '), at(s, 'bold'), at(s, ' and '), at(s, 'red', 1), at(s, ' '), at(s, 'link'), at(s, ' end')]];
  assert.equal(apply(s, req({ kind: 'clear' }, groups)), 'A bold and red link end');
  const wrapped = 'x **all of it** y';
  assert.equal(apply(wrapped, req({ kind: 'clear' }, [[at(wrapped, 'all of it')]])), 'x all of it y');
});

test('headings: set level, turn back into a paragraph, convert setext and join lines', () => {
  assert.equal(apply('Some title\n', req({ kind: 'heading', level: 1 }, [], { blocks: [block(0, 1)] })), '# Some title\n');
  assert.equal(apply('## Sub\n', req({ kind: 'heading', level: 3 }, [], { blocks: [block(0, 1, 'heading')] })), '### Sub\n');
  assert.equal(apply('## Sub ##\n', req({ kind: 'heading', level: 0 }, [], { blocks: [block(0, 1, 'heading')] })), 'Sub\n');
  assert.equal(apply('Title\n=====\n', req({ kind: 'heading', level: 2 }, [], { blocks: [block(0, 2, 'heading')] })), '## Title\n');
  assert.equal(apply('two\nlines\n\nnext', req({ kind: 'heading', level: 2 }, [], { blocks: [block(0, 3)] })), '## two lines\n\nnext');
  assert.equal(apply('> - item\n', req({ kind: 'heading', level: 2 }, [], { blocks: [block(0, 1)] })), '> - ## item\n');
});

test('lists toggle bullets, numbers and tasks', () => {
  const s = 'one\n\ntwo\n';
  const blocks = [block(0, 2), block(2, 3)];
  assert.equal(apply(s, req({ kind: 'list', list: 'bullet' }, [], { blocks })), '- one\n\n- two\n');
  assert.equal(apply(s, req({ kind: 'list', list: 'numbered' }, [], { blocks })), '1. one\n\n2. two\n');
  assert.equal(apply('- one\n- two\n', req({ kind: 'list', list: 'task' }, [], { blocks: [block(0, 1, 'list_item'), block(1, 2, 'list_item')] })), '- [ ] one\n- [ ] two\n');
  assert.equal(apply('- one\n- two\n', req({ kind: 'list', list: 'bullet' }, [], { blocks: [block(0, 1, 'list_item'), block(1, 2, 'list_item')] })), 'one\ntwo\n');
});

test('quotes and alerts', () => {
  assert.equal(apply('one\n\ntwo\n', req({ kind: 'quote' }, [], { blocks: [block(0, 2), block(2, 3)] })), '> one\n>\n> two\n');
  assert.equal(apply('> one\n>\n> two\n', req({ kind: 'quote' }, [], { blocks: [block(0, 2), block(2, 3)] })), 'one\n\ntwo\n');
  assert.equal(apply('Careful now\n', req({ kind: 'alert', alert: 'WARNING' }, [], { blocks: [block(0, 1)] })), '> [!WARNING]\n> Careful now\n');
  assert.equal(apply('> [!NOTE]\n> Text\n', req({ kind: 'alert', alert: 'TIP' }, [], { blocks: [block(1, 2)], alertLine: 0 })), '> [!TIP]\n> Text\n');
  assert.equal(apply('> [!TIP]\n> Text\n', req({ kind: 'alert', alert: 'TIP' }, [], { blocks: [block(1, 2)], alertLine: 0 })), '> Text\n');
});

test('the new selection follows the formatted text', () => {
  const s = 'Hello brave world';
  const result = applyFormat(s, req({ kind: 'mark', mark: 'bold' }, [[at(s, 'brave')]]));
  assert.deepEqual(result.select, { start: 8, end: 13 }); // "Hello **brave** world"
  const off = applyFormat('A **bold** b', req({ kind: 'mark', mark: 'bold' }, [], { active: { start: 4, end: 8 } }));
  assert.deepEqual(off.select, { start: 2, end: 6 });
});

test('nothing to do returns a message instead of edits', () => {
  const result = applyFormat('plain', req({ kind: 'mark', mark: 'bold' }, [], { active: { start: 0, end: 5 } }));
  assert.equal(result.edits.length, 0);
  assert.match(result.message ?? '', /Could not find/);
});
