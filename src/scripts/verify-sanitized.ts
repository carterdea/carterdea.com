#!/usr/bin/env bun

import { chromium } from '@playwright/test';

import type { PageId, SiteId } from '../config/preview-sites';
import { parseBaseArgs, requireArgs } from './lib/cli';

interface VerifyOptions {
  site: SiteId;
  page: PageId;
}

interface ConsoleMessage {
  type: string;
  text: string;
}

async function verifySanitizedHTML(options: VerifyOptions): Promise<void> {
  const { site, page } = options;
  const url = `http://localhost:4321/assets/previews/${site}/${page}.html`;

  console.log(`\nVerifying ${site} ${page}...`);
  console.log(`   URL: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const browserPage = await context.newPage();

  const consoleMessages: ConsoleMessage[] = [];
  const errors: string[] = [];

  browserPage.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  browserPage.on('pageerror', (error) => {
    errors.push(error.message);
  });

  try {
    await browserPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await browserPage.waitForTimeout(2000);

    // Check essential elements
    const searchInput = await browserPage.$(
      'input[type="search"], input[placeholder*="Search"], input[name="q"]'
    );
    const cartButton = await browserPage.$(
      '[href*="cart"], [data-cart], .cart-trigger, [aria-label*="cart"], [aria-label*="Cart"], [aria-label*="bag"], [aria-label*="Bag"]'
    );
    const robotsMeta = await browserPage.$('meta[name="robots"][content*="noindex"]');

    console.log(`   ${searchInput ? 'OK' : 'MISSING'} Search input`);
    console.log(`   ${cartButton ? 'OK' : 'MISSING'} Cart button`);
    console.log(`   ${robotsMeta ? 'OK' : 'MISSING'} Robots meta tag`);

    // Report console errors
    const consoleErrors = consoleMessages.filter((msg) => msg.type === 'error');
    if (consoleErrors.length > 0) {
      console.log(`   ${consoleErrors.length} console errors:`);
      for (const error of consoleErrors.slice(0, 5)) {
        console.log(`      - ${error.text}`);
      }
      if (consoleErrors.length > 5) {
        console.log(`      ... and ${consoleErrors.length - 5} more`);
      }
    } else {
      console.log('   OK No console errors');
    }

    // Report page errors
    if (errors.length > 0) {
      console.log(`   ${errors.length} page errors:`);
      for (const error of errors.slice(0, 3)) {
        console.log(`      - ${error}`);
      }
      if (errors.length > 3) {
        console.log(`      ... and ${errors.length - 3} more`);
      }
    } else {
      console.log('   OK No page errors');
    }

    // Verbose warnings
    const consoleWarnings = consoleMessages.filter((msg) => msg.type === 'warning');
    if (consoleWarnings.length > 0 && process.argv.includes('--verbose')) {
      console.log(`   ${consoleWarnings.length} console warnings`);
    }

    // Overall status
    const hasIssues = errors.length > 0 || consoleErrors.length > 10;
    console.log(hasIssues ? '\n   Page loaded with issues\n' : '\n   Page loaded successfully\n');
  } finally {
    await browser.close();
  }
}

const USAGE = `
Usage: bun run verify:sanitized --site <site> --page <page> [--verbose]

Options:
  --site      stussy | new-era
  --page      home | plp | pdp
  --verbose   Show all console warnings

Examples:
  bun run verify:sanitized --site stussy --page home
  bun run verify:sanitized --site new-era --page plp --verbose

Note: Dev server must be running on http://localhost:4321
`;

async function main(): Promise<void> {
  const args = parseBaseArgs();
  requireArgs(args, USAGE);
  await verifySanitizedHTML(args);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
