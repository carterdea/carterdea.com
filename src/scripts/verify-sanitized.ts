#!/usr/bin/env bun

import { chromium } from '@playwright/test';

interface VerifyOptions {
  site: 'stussy' | 'new-era';
  page: 'home' | 'plp' | 'pdp';
}

async function verifySanitizedHTML(options: VerifyOptions): Promise<void> {
  const { site, page } = options;
  const url = `http://localhost:4321/assets/previews/${site}/${page}.html`;

  console.log(`\n🔍 Verifying ${site} ${page}...`);
  console.log(`   URL: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const browserPage = await context.newPage();

  // Collect console messages
  const consoleMessages: { type: string; text: string }[] = [];
  browserPage.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  // Collect errors
  const errors: string[] = [];
  browserPage.on('pageerror', (error) => {
    errors.push(error.message);
  });

  try {
    // Navigate to sanitized HTML
    await browserPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for page to settle
    await browserPage.waitForTimeout(2000);

    // Check for search functionality
    const searchInput = await browserPage.$(
      'input[type="search"], input[placeholder*="Search"], input[name="q"]'
    );
    console.log(`   ${searchInput ? '✅' : '❌'} Search input found`);

    // Check for cart functionality
    const cartButton = await browserPage.$(
      '[href*="cart"], [data-cart], .cart-trigger, [aria-label*="cart"], [aria-label*="Cart"], [aria-label*="bag"], [aria-label*="Bag"]'
    );
    console.log(`   ${cartButton ? '✅' : '❌'} Cart button found`);

    // Check for robots meta tag
    const robotsMeta = await browserPage.$('meta[name="robots"][content*="noindex"]');
    console.log(`   ${robotsMeta ? '✅' : '❌'} Robots meta tag present`);

    // Report console errors
    const consoleErrors = consoleMessages.filter((msg) => msg.type === 'error');
    if (consoleErrors.length > 0) {
      console.log(`   ⚠️  ${consoleErrors.length} console errors:`);
      for (const error of consoleErrors.slice(0, 5)) {
        console.log(`      - ${error.text}`);
      }
      if (consoleErrors.length > 5) {
        console.log(`      ... and ${consoleErrors.length - 5} more`);
      }
    } else {
      console.log('   ✅ No console errors');
    }

    // Report page errors
    if (errors.length > 0) {
      console.log(`   ⚠️  ${errors.length} page errors:`);
      for (const error of errors.slice(0, 3)) {
        console.log(`      - ${error}`);
      }
      if (errors.length > 3) {
        console.log(`      ... and ${errors.length - 3} more`);
      }
    } else {
      console.log('   ✅ No page errors');
    }

    // Report console warnings (informational only)
    const consoleWarnings = consoleMessages.filter((msg) => msg.type === 'warning');
    if (consoleWarnings.length > 0 && process.argv.includes('--verbose')) {
      console.log(`   ℹ️  ${consoleWarnings.length} console warnings (use --verbose to see)`);
    }

    // Overall status
    const hasIssues = errors.length > 0 || consoleErrors.length > 10;
    if (!hasIssues) {
      console.log('\n   ✅ Page loaded successfully!\n');
    } else {
      console.log('\n   ⚠️  Page loaded with issues (review above)\n');
    }
  } catch (error) {
    console.error(`   ❌ Failed to verify ${site} ${page}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Parse CLI arguments
function parseArgs(): VerifyOptions {
  const args = process.argv.slice(2);
  const options: Partial<VerifyOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--site' && nextArg) {
      if (nextArg !== 'stussy' && nextArg !== 'new-era') {
        throw new Error(`Invalid site: ${nextArg}. Must be 'stussy' or 'new-era'`);
      }
      options.site = nextArg as 'stussy' | 'new-era';
      i++;
    } else if (arg === '--page' && nextArg) {
      if (nextArg !== 'home' && nextArg !== 'plp' && nextArg !== 'pdp') {
        throw new Error(`Invalid page: ${nextArg}. Must be 'home', 'plp', or 'pdp'`);
      }
      options.page = nextArg as 'home' | 'plp' | 'pdp';
      i++;
    }
  }

  if (!options.site || !options.page) {
    console.error(`
Usage: bun run verify:sanitized --site <site> --page <page> [--verbose]

Options:
  --site      stussy | new-era
  --page      home | plp | pdp
  --verbose   Show all console warnings

Examples:
  bun run verify:sanitized --site stussy --page home
  bun run verify:sanitized --site new-era --page plp --verbose

Note: Dev server must be running on http://localhost:4321
`);
    process.exit(1);
  }

  return options as VerifyOptions;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    await verifySanitizedHTML(options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
