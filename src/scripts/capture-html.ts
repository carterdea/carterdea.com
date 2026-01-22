#!/usr/bin/env bun

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

interface CaptureOptions {
  site: 'stussy' | 'new-era';
  page: 'home' | 'plp' | 'pdp';
  url: string;
}

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

async function captureHTML(options: CaptureOptions): Promise<void> {
  const { site, page, url } = options;

  console.log(`\n📸 Capturing ${site} ${page}...`);
  console.log(`   URL: ${url}`);

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const browserPage = await context.newPage();

  try {
    // Navigate to page
    console.log('   Navigating to page...');
    // Use 'load' instead of 'networkidle' as some sites have continuous background requests
    await browserPage.goto(url, { waitUntil: 'load', timeout: 60000 });

    // Wait for Shopify-specific elements to ensure dynamic content is loaded
    console.log('   Waiting for page to fully load...');
    await browserPage.waitForTimeout(5000); // Additional wait for any lazy-loaded content and JS execution

    // Remove cookie consent banners and other unwanted elements
    console.log('   Removing cookie banners and unwanted elements...');
    await browserPage.evaluate(() => {
      // Common cookie consent selectors
      const selectors = [
        '#onetrust-consent-sdk', // OneTrust
        '.osano-cm-dialog', // Osano
        '[data-cookie-banner]',
        '[id*="cookie"]',
        '[class*="cookie-banner"]',
        '[class*="cookie-consent"]',
        '[aria-label*="cookie"]',
        '[aria-label*="Cookie"]',
        // Postscript popup
        '[id*="postscript"]',
        '[class*="postscript"]',
        '#postscript-sms-offer',
        '.postscript-popup',
        // Generic popup/modal selectors
        '[data-popup]',
        '[data-modal]',
        '[class*="popup-"]',
        '[class*="email-popup"]',
        '[class*="sms-popup"]',
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          element.remove();
        }
      }
    });

    // Extract HTML
    console.log('   Extracting HTML...');
    const html = await browserPage.content();

    // Save to file
    const outputPath = join(
      process.cwd(),
      'public',
      'assets',
      'previews',
      site,
      'raw',
      `${page}.html`
    );

    console.log(`   Creating output directory...`);
    await mkdir(dirname(outputPath), { recursive: true });

    console.log(`   Writing HTML to ${outputPath}...`);
    await writeFile(outputPath, html, 'utf-8');

    console.log(`   ✅ Captured ${html.length.toLocaleString()} characters`);
    console.log(`   💾 Saved to: ${outputPath}\n`);
  } catch (error) {
    console.error(`   ❌ Failed to capture ${site} ${page}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Parse CLI arguments
function parseArgs(): CaptureOptions {
  const args = process.argv.slice(2);
  const options: Partial<CaptureOptions> = {};

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
    } else if (arg === '--url' && nextArg) {
      options.url = nextArg;
      i++;
    }
  }

  if (!options.site || !options.page || !options.url) {
    console.error(`
Usage: bun run capture:html --site <site> --page <page> --url <url>

Options:
  --site    stussy | new-era
  --page    home | plp | pdp
  --url     Full URL to capture

Examples:
  bun run capture:html --site stussy --page home --url https://www.stussy.com/
  bun run capture:html --site new-era --page plp --url https://www.neweracap.com/collections/fitted-caps
`);
    process.exit(1);
  }

  return options as CaptureOptions;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    await captureHTML(options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
