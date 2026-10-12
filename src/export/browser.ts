import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Finds an installed Chromium-based browser for PDF export: Microsoft Edge first (present on
 * every Windows PC), then Google Chrome, then Chromium. No browser is ever downloaded.
 */
export function findBrowser(configuredPath: string | undefined, env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string | undefined {
  if (configuredPath) {
    return existsSync(configuredPath) ? configuredPath : undefined;
  }
  return candidatePaths(env, platform).find((candidate) => existsSync(candidate));
}

export function candidatePaths(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string[] {
  if (platform === 'win32') {
    const roots = [env['PROGRAMFILES(X86)'], env.PROGRAMFILES, env.LOCALAPPDATA].filter((r): r is string => !!r);
    return [
      ...roots.map((root) => join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
      ...roots.map((root) => join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')),
      ...roots.map((root) => join(root, 'Chromium', 'Application', 'chrome.exe')),
    ];
  }
  if (platform === 'darwin') {
    return [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }
  return [
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
}
