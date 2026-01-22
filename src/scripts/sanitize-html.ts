#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

interface SanitizeOptions {
  site: 'stussy' | 'new-era';
  page: 'home' | 'plp' | 'pdp';
}

// Vendor scripts to remove (tracking, analytics, marketing)
const VENDOR_PATTERNS = [
  // Explicit vendor domains
  'gorgias',
  'klaviyo',
  'googletagmanager',
  'google-analytics',
  'gtag',
  'gtm.js',
  'osano',
  'rakuten',
  'xgenai',
  'optimizely',
  'yotpo',
  'postscript',
  'rise-ai',
  'twitter',
  'snap',
  'ads-twitter',
  'sc-static.net', // Snapchat
  'analytics.twitter',
  'bat.bing.com', // Microsoft Ads
  'doubleclick',
  'googleadservices',
  'facebook.net/fbevents', // Facebook Pixel
  'connect.facebook.net', // Facebook SDK
  'revy',
  'thetradedesk',
  'adsrvr.org', // The Trade Desk
  'signifyd',
  'pandectes',
  'global-e.com',
  'getredo.com', // Rise AI
  'sendlane.com',
  'kyc.red',
  'elevar', // Elevar conversion tracking
  'fullstory', // Fullstory analytics
  // Shopify tracking/analytics (not essential for preview)
  'trekkie',
  'shop_events_listener',
  'web-pixel',
  'wpm/bfcfee',
  'perf-kit',
  'shop.app/checkouts', // Shop Pay preloads not needed for preview
  'shop-js/modules', // Shop Pay modules cause CORS errors in preview
  // Geolocation
  'geolizr',
];

// Essential Shopify scripts to preserve
const ESSENTIAL_PATTERNS = [
  'shopify-features',
  'theme.js',
  'vendor.js',
  'cart',
  'search',
  'predictive',
  'drawer',
  'variant',
  'storefront/load_feature',
  'shopify_pay/storefront',
  'portable-wallets',
  'consent-tracking-api',
];

async function sanitizeHTML(options: SanitizeOptions): Promise<void> {
  const { site, page } = options;

  console.log(`\n🧹 Sanitizing ${site} ${page}...`);

  // Read raw HTML
  const inputPath = join(
    process.cwd(),
    'public',
    'assets',
    'previews',
    site,
    'raw',
    `${page}.html`
  );

  console.log(`   Reading: ${inputPath}`);
  const html = await readFile(inputPath, 'utf-8');
  console.log(`   Input size: ${(html.length / 1024).toFixed(1)}KB`);

  // Parse HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Track removed scripts
  const removed: string[] = [];
  const preserved: string[] = [];
  const flagged: string[] = [];

  // Remove vendor scripts
  const scripts = Array.from(document.querySelectorAll('script'));
  for (const script of scripts) {
    const src = script.getAttribute('src') || '';
    const id = script.getAttribute('id') || '';
    const content = script.textContent || '';

    // Check if script is essential
    const isEssential = ESSENTIAL_PATTERNS.some(
      (pattern) =>
        src.toLowerCase().includes(pattern.toLowerCase()) ||
        content.toLowerCase().includes(pattern.toLowerCase())
    );

    // Check if script is vendor tracking
    const isVendor = VENDOR_PATTERNS.some(
      (pattern) =>
        src.toLowerCase().includes(pattern.toLowerCase()) ||
        content.toLowerCase().includes(pattern.toLowerCase()) ||
        id.toLowerCase().includes(pattern.toLowerCase())
    );

    // Also check for shop-js references in src, id, or content
    const hasShopJs =
      src.includes('shop-js') ||
      id.includes('shop-js') ||
      content.includes('shop-js') ||
      content.includes("featureAssets['shop-js']");

    if ((isVendor && !isEssential) || hasShopJs) {
      removed.push(src || id || `inline: ${content.substring(0, 50)}...`);
      script.remove();
    } else {
      // Flag potential third-party scripts that don't match known patterns
      if (
        src &&
        !src.includes('shopify') &&
        !src.includes('stussy.com') &&
        !src.includes('neweracap.com') &&
        src.startsWith('http')
      ) {
        // Check if it's not already in vendor patterns
        const isKnownVendor = VENDOR_PATTERNS.some((pattern) =>
          src.toLowerCase().includes(pattern.toLowerCase())
        );
        if (!isKnownVendor && !isEssential) {
          flagged.push(src);
        }
      }

      preserved.push(src || 'inline script');
    }
  }

  // Remove shop-js prefetch links
  const shopJsLinks = document.querySelectorAll('link[href*="shop-js"]');
  for (const link of shopJsLinks) {
    link.remove();
  }

  // Add robots meta tag
  const head = document.querySelector('head');
  if (head) {
    const robotsMeta = document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', 'noindex, nofollow');
    head.insertBefore(robotsMeta, head.firstChild);
    console.log('   ✅ Added robots meta tag');
  }

  // Rewrite links
  let linksRewritten = 0;

  // Logo links → home.html
  const logoLinks = document.querySelectorAll(
    'a[href="/"], a[href^="https://www.stussy.com"], a[href^="https://www.neweracap.com"], .header__logo a, [class*="logo"] a'
  );
  for (const link of logoLinks) {
    const href = link.getAttribute('href');
    if (href && (href === '/' || href.startsWith('http'))) {
      link.setAttribute('href', `/assets/previews/${site}/home.html`);
      linksRewritten++;
    }
  }

  // Navigation links → plp.html
  const navLinks = document.querySelectorAll(
    'nav a, .header__nav a, [class*="navigation"] a, [class*="menu"] a'
  );
  for (const link of navLinks) {
    const href = link.getAttribute('href');
    const text = link.textContent?.toLowerCase() || '';

    // Skip cart, search, account links
    if (
      text.includes('cart') ||
      text.includes('bag') ||
      text.includes('search') ||
      text.includes('account') ||
      text.includes('login')
    ) {
      continue;
    }

    if (href && href !== '#' && !href.startsWith('javascript:')) {
      link.setAttribute('href', `/assets/previews/${site}/plp.html`);
      linksRewritten++;
    }
  }

  // Product links on PLP → pdp.html
  if (page === 'plp') {
    const productLinks = document.querySelectorAll(
      '[class*="product"] a, [class*="card"] a, [data-product] a'
    );
    for (const link of productLinks) {
      const href = link.getAttribute('href');
      if (href && href.includes('/products/')) {
        link.setAttribute('href', `/assets/previews/${site}/pdp.html`);
        linksRewritten++;
      }
    }
  }

  // Featured product/category links on homepage → plp.html
  if (page === 'home') {
    const featuredLinks = document.querySelectorAll(
      'a[href*="/collections/"], a[href*="/products/"]'
    );
    for (const link of featuredLinks) {
      link.setAttribute('href', `/assets/previews/${site}/plp.html`);
      linksRewritten++;
    }
  }

  // Breadcrumb links on PDP
  if (page === 'pdp') {
    const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a, .breadcrumb a');
    for (const link of breadcrumbs) {
      const href = link.getAttribute('href');
      const text = link.textContent?.toLowerCase() || '';

      if (href === '/' || text.includes('home')) {
        link.setAttribute('href', `/assets/previews/${site}/home.html`);
        linksRewritten++;
      } else if (href?.includes('/collections/')) {
        link.setAttribute('href', `/assets/previews/${site}/plp.html`);
        linksRewritten++;
      }
    }
  }

  // Disable external/footer/account/checkout links
  const disableSelectors = [
    'footer a',
    'a[href*="account"]',
    'a[href*="login"]',
    'a[href*="register"]',
    'a[href*="checkout"]',
    'a[href*="facebook.com"]',
    'a[href*="instagram.com"]',
    'a[href*="twitter.com"]',
    'a[href*="youtube.com"]',
    'a[href*="tiktok.com"]',
    'a[href^="mailto:"]',
    'a[href^="tel:"]',
  ];

  for (const selector of disableSelectors) {
    const links = document.querySelectorAll(selector);
    for (const link of links) {
      link.setAttribute('href', '#');
      linksRewritten++;
    }
  }

  console.log(`   ✅ Rewritten ${linksRewritten} links`);

  // Serialize HTML
  const sanitizedHTML = dom.serialize();

  // Write output
  const outputPath = join(process.cwd(), 'public', 'assets', 'previews', site, `${page}.html`);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, sanitizedHTML, 'utf-8');

  console.log(`   ✅ Removed ${removed.length} vendor scripts`);
  console.log(`   ✅ Preserved ${preserved.length} essential scripts`);
  console.log(`   Output size: ${(sanitizedHTML.length / 1024).toFixed(1)}KB`);
  console.log(
    `   Size reduction: ${(((html.length - sanitizedHTML.length) / html.length) * 100).toFixed(1)}%`
  );
  console.log(`   💾 Saved to: ${outputPath}\n`);

  // Report flagged scripts
  if (flagged.length > 0) {
    console.log(`   ⚠️  Flagged ${flagged.length} unknown third-party scripts:`);
    for (const src of flagged) {
      console.log(`      - ${src}`);
    }
    console.log('');
  }

  // Detailed report if verbose
  if (process.argv.includes('--verbose')) {
    console.log('   Removed scripts:');
    for (const src of removed.slice(0, 20)) {
      console.log(`      - ${src}`);
    }
    if (removed.length > 20) {
      console.log(`      ... and ${removed.length - 20} more`);
    }
  }
}

// Parse CLI arguments
function parseArgs(): SanitizeOptions {
  const args = process.argv.slice(2);
  const options: Partial<SanitizeOptions> = {};

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
Usage: bun run sanitize:html --site <site> --page <page> [--verbose]

Options:
  --site      stussy | new-era
  --page      home | plp | pdp
  --verbose   Show detailed removal report

Examples:
  bun run sanitize:html --site stussy --page home
  bun run sanitize:html --site new-era --page plp --verbose
`);
    process.exit(1);
  }

  return options as SanitizeOptions;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    await sanitizeHTML(options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
