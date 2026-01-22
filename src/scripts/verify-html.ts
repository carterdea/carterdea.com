#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

interface VerificationResult {
  site: string;
  page: string;
  fileSize: number;
  loadSuccessful: boolean;
  hasSearchElements: boolean;
  hasCartElements: boolean;
  errors: string[];
}

async function verifyHTML(site: string, page: string): Promise<VerificationResult> {
  const filePath = join(process.cwd(), 'public', 'assets', 'previews', site, 'raw', `${page}.html`);
  const html = await readFile(filePath, 'utf-8');

  const result: VerificationResult = {
    site,
    page,
    fileSize: html.length,
    loadSuccessful: false,
    hasSearchElements: false,
    hasCartElements: false,
    errors: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const browserPage = await context.newPage();

  // Collect console errors
  browserPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      result.errors.push(msg.text());
    }
  });

  try {
    // Load HTML directly
    await browserPage.setContent(html, { waitUntil: 'load', timeout: 30000 });
    result.loadSuccessful = true;

    // Check for search elements
    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      '[data-predictive-search]',
      '.predictive-search',
      'form[action*="search"]',
    ];

    for (const selector of searchSelectors) {
      const element = await browserPage.$(selector);
      if (element) {
        result.hasSearchElements = true;
        break;
      }
    }

    // Check for cart elements
    const cartSelectors = [
      '[data-cart]',
      '.cart',
      'cart-drawer',
      'form[action*="cart"]',
      '[href*="cart"]',
    ];

    for (const selector of cartSelectors) {
      const element = await browserPage.$(selector);
      if (element) {
        result.hasCartElements = true;
        break;
      }
    }

    // Wait a bit to catch any runtime errors
    await browserPage.waitForTimeout(2000);
  } catch (error) {
    result.errors.push(String(error));
  } finally {
    await browser.close();
  }

  return result;
}

async function main() {
  console.log('\n🔍 Verifying captured HTML files...\n');

  const sites = [
    { site: 'stussy', pages: ['home', 'plp', 'pdp'] },
    { site: 'new-era', pages: ['home', 'plp', 'pdp'] },
  ];

  const results: VerificationResult[] = [];

  for (const { site, pages } of sites) {
    for (const page of pages) {
      console.log(`Verifying ${site} ${page}...`);
      const result = await verifyHTML(site, page);
      results.push(result);
    }
  }

  console.log('\n📊 Verification Results:\n');

  let allPassed = true;

  for (const result of results) {
    const status = result.loadSuccessful ? '✅' : '❌';
    const search = result.hasSearchElements ? '✓' : '✗';
    const cart = result.hasCartElements ? '✓' : '✗';

    console.log(
      `${status} ${result.site.padEnd(10)} ${result.page.padEnd(6)} (${(result.fileSize / 1024).toFixed(0)}KB)`
    );
    console.log(`   Search: ${search}  Cart: ${cart}`);

    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
      allPassed = false;
    }

    console.log('');
  }

  if (allPassed) {
    console.log('✅ All files verified successfully!\n');
  } else {
    console.log('⚠️  Some files have errors. Review output above.\n');
    process.exit(1);
  }
}

main();
