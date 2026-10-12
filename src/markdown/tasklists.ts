import type MarkdownIt from 'markdown-it';

const TASK = /^\[([ xX])\]\s+/;

/**
 * GitHub task lists: `- [ ] todo` / `- [x] done`. Rendered as read-only ☐/☑ marks (no form
 * inputs), so the output is identical in the preview, HTML/PDF and Word.
 */
export function taskListPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'mdp_tasklists', (state) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i];
      if (inline.type !== 'inline' || tokens[i - 1].type !== 'paragraph_open' || tokens[i - 2].type !== 'list_item_open') {
        continue;
      }
      const first = inline.children?.[0];
      const match = first?.type === 'text' ? TASK.exec(first.content) : null;
      if (!first || !match) {
        continue;
      }
      const checked = match[1] !== ' ';
      first.content = first.content.slice(match[0].length);
      const mark = new state.Token('mdp_task', 'span', 0);
      mark.meta = { checked };
      inline.children!.unshift(mark);
      tokens[i - 2].attrJoin('class', 'mdp-task-item');
    }
  });

  md.renderer.rules.mdp_task = (tokens, idx) => {
    const checked = (tokens[idx].meta as { checked: boolean }).checked;
    return `<span class="mdp-task${checked ? ' mdp-task-done' : ''}" role="img" aria-label="${checked ? 'done' : 'not done'}">${checked ? '☑' : '☐'}</span> `;
  };
}
