// Minimal typings for markdown-it plugins that ship without types.
declare module 'markdown-it-footnote' {
  import type { PluginSimple } from 'markdown-it';
  const plugin: PluginSimple;
  export default plugin;
}
declare module 'markdown-it-deflist' {
  import type { PluginSimple } from 'markdown-it';
  const plugin: PluginSimple;
  export default plugin;
}
declare module 'markdown-it-abbr' {
  import type { PluginSimple } from 'markdown-it';
  const plugin: PluginSimple;
  export default plugin;
}
declare module 'markdown-it-sub' {
  import type { PluginSimple } from 'markdown-it';
  const plugin: PluginSimple;
  export default plugin;
}
declare module 'markdown-it-sup' {
  import type { PluginSimple } from 'markdown-it';
  const plugin: PluginSimple;
  export default plugin;
}
declare module 'markdown-it-mark' {
  import type { PluginSimple } from 'markdown-it';
  const plugin: PluginSimple;
  export default plugin;
}
declare module 'markdown-it-ins' {
  import type { PluginSimple } from 'markdown-it';
  const plugin: PluginSimple;
  export default plugin;
}
declare module 'markdown-it-emoji' {
  import type { PluginSimple } from 'markdown-it';
  export const full: PluginSimple;
}
declare module 'markdown-it-container' {
  import type { PluginWithParams } from 'markdown-it';
  const plugin: PluginWithParams;
  export default plugin;
}
