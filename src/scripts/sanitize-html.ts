#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { JSDOM } from 'jsdom';

import type { PageId, SiteId } from '../config/preview-sites';
import { parseBaseArgs, requireArgs } from './lib/cli';

interface SanitizeOptions {
  site: SiteId;
  page: PageId;
}

// Vendor scripts to remove (tracking, analytics, marketing)
const VENDOR_PATTERNS = [
  // Analytics and tracking
  'googletagmanager',
  'google-analytics',
  'gtag',
  'gtm.js',
  'doubleclick',
  'googleadservices',
  'facebook.net/fbevents',
  'connect.facebook.net',
  'analytics.twitter',
  'ads-twitter',
  'twitter',
  'snap',
  'sc-static.net',
  'bat.bing.com',
  'thetradedesk',
  'adsrvr.org',
  'elevar',
  'fullstory',
  'tag_assistant',
  'aria-listener',
  'logHelper',
  '@aria/webjs-sdk',
  '@bingads-webui',
  'clarity.ms',
  'zencastr.com',
  'dotlottie',
  'swiper',
  'xgen.dev',
  '9gtb.com',
  'imask',
  'amplitude.com',
  'nba.com',
  // Marketing tools
  'gorgias',
  'klaviyo',
  'osano',
  'rakuten',
  'xgenai',
  'optimizely',
  'yotpo',
  'postscript',
  'rise-ai',
  'revy',
  'signifyd',
  'pandectes',
  'global-e.com',
  'getredo.com',
  'sendlane.com',
  'kyc.red',
  'consentmo',
  'redirect-app',
  'true-fans-tracking',
  // Shopify tracking (not essential for preview)
  'trekkie',
  'shop_events_listener',
  'web-pixel',
  'wpm/bfcfee',
  'wpm/sfcfee',
  'wpm/bfcfee988w5aeb613cpc8e4bc33m6693e112m',
  'sfcfee988w5aeb613cpc8e4bc33m6693e112m',
  'bfcfee988w5aeb613cpc8e4bc33m6693e112m',
  'perf-kit',
  'shop.app/checkouts',
  'shop-js/modules',
  'monorail/unstable',
  'checkouts/internal/preloads',
  // Shopify checkout (not needed for preview)
  'checkout-web',
  'shopifycloud/checkout-web',
  '/cdn/shopifycloud/checkout-web',
  'polyfills.bu5XgDjl',
  'app.O45uQuey',
  'locale-en._KlOf2hp',
  'NumberField.C74HZD_h',
  'page-OnePage',
  'AddDiscountButton',
  'ShopPayOptInDisclaimer',
  'RememberMeDescriptionText',
  'useShowShopPayOptin',
  'StockProblemsLineItemList',
  'useShopPayButtonClassName',
  'PaymentButtons',
  'LocalPickup',
  'SeparatePaymentsNotice',
  'useAddressManager',
  'useShopPayQuery',
  'VaultedPayment',
  'ShipmentBreakdown',
  'MerchandiseModal',
  'ShopPayVerificationSwitch',
  'StackedMerchandisePreview',
  'PayButtonSection',
  'useSubscribeMessenger',
  'RuntimeExtension',
  'AnnouncementRuntimeExtensions',
  'rendering-extension-targets',
  'ExtensionsInner',
  'shopify_pay/accelerated_checkout',
  'storefront-65b4c6d7',
  // Geolocation
  'geolizr',
  'GeolizrAPI',
  // Animation libraries (not needed for static preview)
  'gsap',
  'ScrollTrigger',
  'ScrambleTextPlugin',
  'cdn.jsdelivr.net',
  // App integrations (not functional in preview)
  '/apps/sale-sight',
  '/apps/loggedincustomer',
  'webauthn-listeners',
  'xgen-tracking',
  'gdpr_cookie_consent',
  'app.v1.0.368',
];

// Essential Shopify scripts to preserve (only search & cart functionality)
const ESSENTIAL_PATTERNS = [
  'theme.js',
  'cart',
  'search',
  'predictive-search',
  'drawer',
  'variant',
];

function matchesPattern(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function hasShopJsReference(src: string, id: string, content: string): boolean {
  return (
    src.includes('shop-js') ||
    id.includes('shop-js') ||
    content.includes('shop-js') ||
    content.includes("featureAssets['shop-js']")
  );
}

async function sanitizeHTML(options: SanitizeOptions): Promise<void> {
  const { site, page } = options;

  console.log(`\nSanitizing ${site} ${page}...`);

  const inputPath = join(process.cwd(), 'public', 'assets', 'previews', site, 'raw', `${page}.html`);
  console.log(`   Reading: ${inputPath}`);

  const html = await readFile(inputPath, 'utf-8');
  console.log(`   Input size: ${(html.length / 1024).toFixed(1)}KB`);

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const removed: string[] = [];
  const preserved: string[] = [];
  const flagged: string[] = [];

  // Script IDs to remove (tracking/analytics inline scripts)
  const BLOCKED_SCRIPT_IDS = [
    'web-pixels-manager-setup',
    'shop-js-analytics',
    'shopify-features',
    'gorgias-chat-bundle',
    'rev-script-bundle',
    'xgen-sdk-script-app-embed',
    '__st',
    'apple-pay-shop-capabilities',
  ];

  // Remove vendor scripts
  const scripts = Array.from(document.querySelectorAll('script'));
  for (const script of scripts) {
    const src = script.getAttribute('src') || '';
    const id = script.getAttribute('id') || '';
    const content = script.textContent || '';

    // Check if script ID is blocked
    const isBlockedId = BLOCKED_SCRIPT_IDS.includes(id);

    const isEssential =
      matchesPattern(src, ESSENTIAL_PATTERNS) || matchesPattern(content, ESSENTIAL_PATTERNS);
    const isVendor =
      matchesPattern(src, VENDOR_PATTERNS) ||
      matchesPattern(content, VENDOR_PATTERNS) ||
      matchesPattern(id, VENDOR_PATTERNS);
    const hasShopJs = hasShopJsReference(src, id, content);

    if (isBlockedId || (isVendor && !isEssential) || hasShopJs) {
      removed.push(src || id || `inline: ${content.substring(0, 50)}...`);
      script.remove();
    } else {
      // Flag unknown third-party scripts
      if (
        src &&
        !src.includes('shopify') &&
        !src.includes('stussy.com') &&
        !src.includes('neweracap.com') &&
        src.startsWith('http') &&
        !matchesPattern(src, VENDOR_PATTERNS) &&
        !isEssential
      ) {
        flagged.push(src);
      }
      preserved.push(src || 'inline script');
    }
  }

  // Remove unwanted prefetch/preload links
  const unwantedLinks = document.querySelectorAll(
    'link[href*="shop-js"], link[href*="gsap"], link[href*="ScrollTrigger"], link[href*="ScrambleTextPlugin"], link[href*="cdn.jsdelivr.net"], link[href*="checkout-web"]'
  );
  for (const link of unwantedLinks) {
    link.remove();
  }

  // Add robots meta tag
  const head = document.querySelector('head');
  if (head) {
    const robotsMeta = document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', 'noindex, nofollow');
    head.insertBefore(robotsMeta, head.firstChild);
    console.log('   Added robots meta tag');
  }

  // Rewrite links
  const linksRewritten = rewriteLinks(document, site, page);
  console.log(`   Rewritten ${linksRewritten} links`);

  // Serialize and save
  const sanitizedHTML = dom.serialize();
  const outputPath = join(process.cwd(), 'public', 'assets', 'previews', site, `${page}.html`);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, sanitizedHTML, 'utf-8');

  console.log(`   Removed ${removed.length} vendor scripts`);
  console.log(`   Preserved ${preserved.length} essential scripts`);
  console.log(`   Output size: ${(sanitizedHTML.length / 1024).toFixed(1)}KB`);
  console.log(
    `   Size reduction: ${(((html.length - sanitizedHTML.length) / html.length) * 100).toFixed(1)}%`
  );
  console.log(`   Saved to: ${outputPath}\n`);

  if (flagged.length > 0) {
    console.log(`   Flagged ${flagged.length} unknown third-party scripts:`);
    for (const src of flagged) {
      console.log(`      - ${src}`);
    }
    console.log('');
  }

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

function rewriteLinks(document: Document, site: SiteId, page: PageId): number {
  let count = 0;
  const basePath = `/assets/previews/${site}`;

  // Logo links -> home.html
  const logoSelectors =
    'a[href="/"], a[href^="https://www.stussy.com"], a[href^="https://www.neweracap.com"], .header__logo a, [class*="logo"] a';
  for (const link of document.querySelectorAll(logoSelectors)) {
    const href = link.getAttribute('href');
    if (href && (href === '/' || href.startsWith('http'))) {
      link.setAttribute('href', `${basePath}/home.html`);
      count++;
    }
  }

  // Navigation links -> plp.html
  const navSelectors = 'nav a, .header__nav a, [class*="navigation"] a, [class*="menu"] a';
  for (const link of document.querySelectorAll(navSelectors)) {
    const href = link.getAttribute('href');
    const text = link.textContent?.toLowerCase() || '';

    // Skip utility links
    if (/cart|bag|search|account|login/.test(text)) continue;

    if (href && href !== '#' && !href.startsWith('javascript:')) {
      link.setAttribute('href', `${basePath}/plp.html`);
      count++;
    }
  }

  // Page-specific link rewrites
  if (page === 'plp') {
    // Product links on PLP -> pdp.html
    for (const link of document.querySelectorAll(
      '[class*="product"] a, [class*="card"] a, [data-product] a'
    )) {
      const href = link.getAttribute('href');
      if (href?.includes('/products/')) {
        link.setAttribute('href', `${basePath}/pdp.html`);
        count++;
      }
    }
  }

  if (page === 'home') {
    // Featured links on homepage -> plp.html
    for (const link of document.querySelectorAll(
      'a[href*="/collections/"], a[href*="/products/"]'
    )) {
      link.setAttribute('href', `${basePath}/plp.html`);
      count++;
    }
  }

  if (page === 'pdp') {
    // Breadcrumb links on PDP
    for (const link of document.querySelectorAll('[class*="breadcrumb"] a, .breadcrumb a')) {
      const href = link.getAttribute('href');
      const text = link.textContent?.toLowerCase() || '';

      if (href === '/' || text.includes('home')) {
        link.setAttribute('href', `${basePath}/home.html`);
        count++;
      } else if (href?.includes('/collections/')) {
        link.setAttribute('href', `${basePath}/plp.html`);
        count++;
      }
    }
  }

  // Disable external/footer/account links
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
    for (const link of document.querySelectorAll(selector)) {
      link.setAttribute('href', '#');
      count++;
    }
  }

  return count;
}

const USAGE = `
Usage: bun run sanitize:html --site <site> --page <page> [--verbose]

Options:
  --site      stussy | new-era
  --page      home | plp | pdp
  --verbose   Show detailed removal report

Examples:
  bun run sanitize:html --site stussy --page home
  bun run sanitize:html --site new-era --page plp --verbose
`;

async function main(): Promise<void> {
  const args = parseBaseArgs();
  requireArgs(args, USAGE);
  await sanitizeHTML(args);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
