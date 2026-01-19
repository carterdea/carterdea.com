#!/usr/bin/env node
/**
 * Sanitize Shopify HTML for preview mode
 *
 * Usage:
 *   bun scripts/sanitize-shopify.js https://www.stussy.com stussy
 *   bun scripts/sanitize-shopify.js https://www.neweracap.com new-era
 *
 * Output: public/previews/{name}.html
 */

const url = process.argv[2];
const name = process.argv[3];

if (!url || !name) {
  console.error('Usage: bun scripts/sanitize-shopify.js <url> <name>');
  console.error('Example: bun scripts/sanitize-shopify.js https://www.stussy.com stussy');
  process.exit(1);
}

const baseUrl = new URL(url).origin;

async function fetchAndSanitize() {
  console.log(`Fetching ${url}...`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status}`);
    process.exit(1);
  }

  let html = await response.text();
  console.log(`Fetched ${html.length} bytes`);

  // Remove all <link rel="alternate" hreflang> tags
  html = html.replace(/<link\s+rel="alternate"[^>]*hreflang[^>]*\/?>/gi, '');

  // Scripts to KEEP (allowlist)
  const keepScriptPatterns = [
    /vendor\.js/i,
    /theme\.js/i,
    /application\/ld\+json/i,
    /text\/template/i,
    /application\/json/i,
  ];

  // Scripts to REMOVE
  const removeScriptPatterns = [
    // Google
    /gtm/i,
    /google-analytics/i,
    /googletagmanager/i,
    /gtag/i,
    /doubleclick/i,
    /floodlight/i,
    // Social/marketing
    /klaviyo/i,
    /facebook/i,
    /fbq/i,
    /tiktok/i,
    /ttq/i,
    /pinterest/i,
    /pintrk/i,
    /attentive/i,
    /sendlane/i,
    // Analytics/tracking
    /monorail/i,
    /trekkie/i,
    /analytics/i,
    /tracking/i,
    /dataLayer/i,
    /utm/i,
    /elevar/i,
    /littledata/i,
    /segment/i,
    /heap/i,
    /hotjar/i,
    /fullstory/i,
    /logrocket/i,
    /sentry/i,
    // Fraud/security (not needed for preview)
    /signifyd/i,
    /captcha/i,
    // Cookie consent
    /pandectes/i,
    /cookie-?consent/i,
    /onetrust/i,
    // Payment providers (not needed for preview)
    /afterpay/i,
    /shopify_pay/i,
    /shop-js/i,
    /shop\.app/i,
    /apple-pay/i,
    /dynamic_checkout/i,
    /buyer_consent/i,
    // Internationalization
    /global-e/i,
    /geolizr/i,
    /international-messaging/i,
    /language-welcome/i,
    // Shopify extras
    /__st/i,
    /shopify\.loadfeatures/i,
    /preloads\.js/i,
    // Chat
    /gorgias/i,
    /zendesk/i,
    /intercom/i,
    // Reviews/UGC
    /yotpo/i,
    /stamped/i,
    /judgeme/i,
    /loox/i,
    /okendo/i,
    // A/B testing
    /optimizely/i,
    /vwo/i,
    /abtasty/i,
    // Cookie consent
    /osano/i,
    /cookiebot/i,
    /termly/i,
    /iubenda/i,
    // Third-party apps
    /revy\.io/i,
    /xgen\.dev/i,
    /hulkapps/i,
    /dotlottie/i,
    /imask/i,
    // Loyalty/rewards
    /loyalty/i,
    /smile\.io/i,
    /yotpo-loyalty/i,
    // Accessibility overlays (not needed for preview)
    /ada-base/i,
    /accessibe/i,
    /userway/i,
    // Redirects
    /redirect/i,
  ];

  // Process script tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
    const lowerMatch = match.toLowerCase();

    for (const pattern of keepScriptPatterns) {
      if (pattern.test(lowerMatch)) {
        return match;
      }
    }

    for (const pattern of removeScriptPatterns) {
      if (pattern.test(lowerMatch)) {
        return '';
      }
    }

    // Keep small config objects
    if (!match.includes('src=')) {
      if (/window\.(strings|currency|shopify|theme)/i.test(match) && match.length < 5000) {
        return match;
      }
      return '';
    }

    return match;
  });

  // Remove noscript tracking pixels
  html = html.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // Remove gorgias web components
  html = html.replace(/<gorgias-[^>]*>[^<]*<\/gorgias-[^>]*>/gi, '');

  // Fix relative URLs to absolute
  html = html.replace(/href="\/(?!\/)/g, `href="${baseUrl}/`);
  html = html.replace(/src="\/(?!\/)/g, `src="${baseUrl}/`);
  html = html.replace(/href="\/\//g, 'href="https://');
  html = html.replace(/src="\/\//g, 'src="https://');

  // Add base tag
  const baseTag = `<base href="${baseUrl}/" target="_blank">`;
  html = html.replace(/<head>/, '<head>\n' + baseTag);

  // Add custom styles and fake interactivity
  const customStyles = `
<style>
  /* Hide cookie consent / announcement bars */
  .site-announcement,
  [js-announcement-banner] {
    display: none !important;
  }

  /* Force hero visibility */
  [js-rotational-hero-block].hidden {
    display: block !important;
  }

  /* Preview mode overlay */
  .preview-overlay {
    position: fixed;
    top: 60px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 60px);
    background: rgba(0,0,0,0.3);
    z-index: 9990;
    display: none;
  }
  .preview-overlay.open {
    display: block;
  }
  /* Keep header above overlay */
  .site-header, s-header, header, [id*="header"] {
    z-index: 9999 !important;
  }
  /* Show search drawer when preview-open */
  #SearchDrawer.preview-open,
  .search-drawer.preview-open,
  s-drawer[id="SearchDrawer"].preview-open {
    display: block !important;
    position: fixed !important;
    top: 60px !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 9995 !important;
    background: white !important;
  }
  /* Show cart drawer when preview-open */
  .ajaxcart.preview-open,
  s-ajaxcart.preview-open {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 50% !important;
    max-width: 500px !important;
    height: 100vh !important;
    z-index: 9995 !important;
    background: white !important;
  }
</style>
`;

  // Inject overlay and JS to control existing Stussy drawers
  const fakeDrawers = `
<!-- Preview Mode Overlay and Controls -->
<div class="preview-overlay" id="preview-overlay"></div>
<script>
(function() {
  const overlay = document.getElementById('preview-overlay');
  const searchDrawer = document.querySelector('#SearchDrawer, .search-drawer');
  const cartDrawer = document.querySelector('.ajaxcart, s-ajaxcart');
  const searchOpenBtns = document.querySelectorAll('[js-open-search]');
  const searchCloseBtns = document.querySelectorAll('[js-close-search]');
  const cartOpenBtns = document.querySelectorAll('[js-cart-drawer-open]');
  const cartCloseBtns = document.querySelectorAll('[js-cart-drawer-close]');

  let searchOpen = false;
  let cartOpen = false;

  function openSearch() {
    searchOpen = true;
    overlay.classList.add('open');
    if (searchDrawer) {
      searchDrawer.classList.add('preview-open');
      searchDrawer.setAttribute('open', '');
    }
    // Toggle button text
    searchOpenBtns.forEach(btn => {
      if (btn.textContent.trim() === 'SEARCH') btn.textContent = 'CLOSE';
    });
  }

  function closeSearch() {
    searchOpen = false;
    if (searchDrawer) {
      searchDrawer.classList.remove('preview-open');
      searchDrawer.removeAttribute('open');
    }
    if (!cartOpen) overlay.classList.remove('open');
    // Toggle button text back
    searchOpenBtns.forEach(btn => {
      if (btn.textContent.trim() === 'CLOSE') btn.textContent = 'SEARCH';
    });
  }

  function openCart() {
    cartOpen = true;
    overlay.classList.add('open');
    if (cartDrawer) {
      cartDrawer.classList.remove('hidden');
      cartDrawer.classList.add('preview-open');
    }
  }

  function closeCart() {
    cartOpen = false;
    if (cartDrawer) {
      cartDrawer.classList.add('hidden');
      cartDrawer.classList.remove('preview-open');
    }
    if (!searchOpen) overlay.classList.remove('open');
  }

  function closeAll() {
    closeSearch();
    closeCart();
  }

  // Search toggle
  searchOpenBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (searchOpen) closeSearch();
      else openSearch();
    });
  });
  searchCloseBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSearch();
    });
  });

  // Cart toggle
  cartOpenBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCart();
    });
  });
  cartCloseBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeCart();
    });
  });

  // Overlay click closes all
  overlay.addEventListener('click', closeAll);
})();
</script>
`;
  html = html.replace('</head>', customStyles + '</head>');
  html = html.replace('</body>', fakeDrawers + '</body>');

  // Write output
  const outputPath = `public/previews/${name}.html`;
  await Bun.write(outputPath, html);

  const scriptCount = (html.match(/<script/gi) || []).length;
  console.log(`Wrote ${outputPath}`);
  console.log(`Size: ${Math.round(html.length / 1024)}KB (${scriptCount} scripts remaining)`);
}

fetchAndSanitize().catch(console.error);
