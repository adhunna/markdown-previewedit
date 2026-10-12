import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

export interface PdfOptions {
  readonly browserPath: string;
  readonly format: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
  readonly margin: string;
  readonly waitForMermaid: boolean;
  readonly timeoutMs?: number;
  /** Extra browser flags (tests use this for container sandboxes; the extension never does). */
  readonly extraArgs?: readonly string[];
}

/**
 * Prints an exported HTML page to PDF with the installed browser (headless). Only local
 * files, data URIs and web images may load; everything else is blocked.
 */
export async function renderPdf(html: string, options: PdfOptions): Promise<Uint8Array> {
  const timeout = options.timeoutMs ?? 60_000;
  const workDir = await mkdtemp(join(tmpdir(), 'mdp-pdf-'));
  const htmlPath = join(workDir, 'document.html');
  await writeFile(htmlPath, html, 'utf8');

  const browser = await puppeteer.launch({
    executablePath: options.browserPath,
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', ...(options.extraArgs ?? [])],
  });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const allowed = url.startsWith('file:') || url.startsWith('data:') || (request.resourceType() === 'image' && /^https?:/.test(url));
      void (allowed ? request.continue() : request.abort());
    });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout });
    if (options.waitForMermaid) {
      await page.waitForFunction('window.__mdpMermaidDone === true', { timeout });
    }
    return await page.pdf({
      format: options.format,
      printBackground: true,
      margin: { top: options.margin, right: options.margin, bottom: options.margin, left: options.margin },
      timeout,
    });
  } finally {
    await browser.close();
    await rm(workDir, { recursive: true, force: true });
  }
}
