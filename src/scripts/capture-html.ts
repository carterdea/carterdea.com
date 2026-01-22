#!/usr/bin/env bun

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { chromium } from '@playwright/test';

import type { PageId, SiteId } from '../config/preview-sites';
import { getUrlArg, parseBaseArgs, requireArgs } from './lib/cli';

interface CaptureOptions {
  site: SiteId;
  page: PageId;
  url: string;
}

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

// Selectors for elements to remove during capture
const UNWANTED_ELEMENT_SELECTORS = [
  // Cookie consent
  '#onetrust-consent-sdk',
  '.osano-cm-dialog',
  '[data-cookie-banner]',
  '[id*="cookie"]',
  '[class*="cookie-banner"]',
  '[class*="cookie-consent"]',
  '[aria-label*="cookie"]',
  '[aria-label*="Cookie"]',
  // Marketing popups
  '[id*="postscript"]',
  '[class*="postscript"]',
  '#postscript-sms-offer',
  '.postscript-popup',
  '[data-popup]',
  '[data-modal]',
  '[class*="popup-"]',
  '[class*="email-popup"]',
  '[class*="sms-popup"]',
];

async function captureHTML(options: CaptureOptions): Promise<void> {
  const { site, page, url } = options;

  console.log(`\nCapturing ${site} ${page}...`);
  console.log(`   URL: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const browserPage = await context.newPage();

  try {
    console.log('   Navigating to page...');
    await browserPage.goto(url, { waitUntil: 'load', timeout: 60000 });

    console.log('   Waiting for page to fully load...');
    await browserPage.waitForTimeout(5000);

    console.log('   Removing cookie banners and unwanted elements...');
    await browserPage.evaluate((selectors) => {
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          element.remove();
        }
      }
    }, UNWANTED_ELEMENT_SELECTORS);

    console.log('   Extracting HTML...');
    const html = await browserPage.content();

    const outputPath = join(process.cwd(), 'public', 'assets', 'previews', site, 'raw', `${page}.html`);

    console.log(`   Creating output directory...`);
    await mkdir(dirname(outputPath), { recursive: true });

    console.log(`   Writing HTML to ${outputPath}...`);
    await writeFile(outputPath, html, 'utf-8');

    console.log(`   Captured ${html.length.toLocaleString()} characters`);
    console.log(`   Saved to: ${outputPath}\n`);
  } finally {
    await browser.close();
  }
}

const USAGE = `
Usage: bun run capture:html --site <site> --page <page> --url <url>

Options:
  --site    stussy | new-era
  --page    home | plp | pdp
  --url     Full URL to capture

Examples:
  bun run capture:html --site stussy --page home --url https://www.stussy.com/
  bun run capture:html --site new-era --page plp --url https://www.neweracap.com/collections/fitted-caps
`;

async function main(): Promise<void> {
  const args = parseBaseArgs();
  const url = getUrlArg();

  if (!url) {
    console.error(USAGE);
    process.exit(1);
  }

  requireArgs(args, USAGE);

  await captureHTML({ site: args.site, page: args.page, url });
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
