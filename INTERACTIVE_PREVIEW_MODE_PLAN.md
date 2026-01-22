# Interactive Preview Mode Implementation Plan

## Overview

Transform static screenshot previews into interactive, sandboxed web experiences inside vintage computer components. Users will be able to browse sanitized versions of Stussy and New Era websites with working search and cart functionality.

## Current State

- Static PNG screenshots displayed in PowerMacintosh and iMac G4 components
- Saved HTML snapshots exist but unused
- No interactivity—feels like mockup not live preview
- CORS/X-Frame-Options blocks iframe embedding

## Goals

- [ ] Interactive search and cart functionality
- [ ] Minimal JavaScript (remove 80-95% of tracking/analytics)
- [ ] Support multiple pages per site (home, PLP, PDP)
- [ ] Support multiple sites (Stussy, New Era initially)
- [ ] SEO protection for preview assets
- [ ] 1280px viewport scaled to fit computer screens

## Technical Approach

### Core Strategy

1. **Sanitize HTML** - Strip tracking scripts, keep Shopify cart/search
2. **Iframe srcdoc** - Bypass CORS using same-origin content
3. **CSS transform scaling** - Scale 1280px viewport to ~400px screen
4. **Interaction modes** - Toggle between dragging computer vs interacting with site
5. **Lazy loading** - Load HTML only when computer powers on

### Files to Create

```
src/
├── components/
│   └── InteractivePreview/
│       ├── InteractivePreview.tsx       # New iframe component
│       ├── InteractivePreview.module.css
│       └── index.ts
├── config/
│   └── preview-sites.ts                 # Site/page configuration
├── scripts/
│   └── sanitize-html.ts                 # HTML sanitization CLI tool
└── utils/
    └── sanitizeHTML.ts                  # Sanitization logic
```

### Files to Modify

```
src/components/
├── PowerMacintosh/PowerMacintosh.tsx    # Add previewSite prop
├── IMacG4/IMacG4.tsx                    # Add previewSite prop
└── PreviewModeSection/
    └── PreviewModeSection.tsx           # Pass site/page config

public/
├── robots.txt                           # Block /assets/previews/
└── assets/previews/
    ├── stussy/
    │   ├── home.html                    # Sanitized homepage
    │   ├── plp.html                     # Sanitized product listing
    │   └── pdp.html                     # Sanitized product detail
    └── new-era/
        ├── home.html
        ├── plp.html
        └── pdp.html
```

## Vendor Scripts to Remove

Remove all tracking/analytics/marketing scripts:

- Gorgias
- Klaviyo
- Google Analytics
- Google Tag Manager
- Osano
- Rakuten
- XgenAI
- Optimizely
- Yotpo
- Postscript
- Rise AI
- Twitter Ads
- Snap Pixel
- Microsoft Ads
- DoubleClick
- Revy
- The Trade Desk
- Signifyd
- Pandectes
- Global-E

## Scripts to Preserve

Keep only essential Shopify functionality:

- `shopify-features` (JSON config in `<head>`)
- Theme scripts (`theme.js`, section scripts)
- Cart drawer functionality
- Predictive search
- Product variant selection

## Link Rewriting Rules

Rewrite all links to keep navigation within our sanitized pages, preventing external navigation:

**Logo links:**
- All logo/brand links → `/assets/previews/{site}/home.html`

**Navigation links:**
- All header/footer nav links (except search/cart) → `/assets/previews/{site}/plp.html`

**Homepage links:**
- Featured product/category links → `/assets/previews/{site}/plp.html`

**PLP (Product Listing Page) links:**
- All product card links → `/assets/previews/{site}/pdp.html`
- Category/filter links → `/assets/previews/{site}/plp.html` (same page)

**PDP (Product Detail Page) links:**
- Breadcrumb links → respective page (`home.html` or `plp.html`)
- Related product links → `/assets/previews/{site}/pdp.html` (same page)

**Disabled links (set to `href="#"` to preserve styling):**
- Footer links (legal, help, about, etc.) → `#`
- External links (social media, help center, etc.) → `#`
- Account/login links → `#`
- Checkout links → `#` (cart drawer can stay visual-only)
- Any other non-critical links → `#`

**Preserved functionality:**
- Search inputs/buttons (keep functional)
- Cart drawer toggle (keep functional)
- Product variant selectors on PDP (keep functional)

## Implementation Phases

### Phase 0: Content Capture

**Goal:** Download raw HTML from target websites

**Best Practice Approach:** Use Playwright to capture fully-rendered HTML with all dynamic content and Shopify scripts loaded.

**Tool Setup:**
- [x] Verify Playwright is installed: `bun add -d playwright`
- [x] Create capture script: `src/scripts/capture-html.ts`

**URLs to Capture:**

**Stussy (stussy.com):**
- [x] Homepage: `https://www.stussy.com/`
- [x] PLP: `https://www.stussy.com/collections/tees`
- [x] PDP: `https://www.stussy.com/collections/tees/products/1905000-basic-stussy-tee-black`

**New Era (neweracap.com):**
- [x] Homepage: `https://www.neweracap.com/`
- [x] PLP: `https://www.neweracap.com/collections/new-york-yankees`
- [x] PDP: `https://www.neweracap.com/products/new-york-yankees-authentic-collection-59fifty-fitted`

**Capture Script Features:**
```typescript
// src/scripts/capture-html.ts
// - Launch headless browser at 1280px viewport
// - Wait for page load + network idle
// - Wait for critical Shopify scripts to execute
// - Extract full HTML including dynamic content
// - Save to public/assets/previews/{site}/raw/{page}.html
// - CLI: bun run capture:html --site stussy --page home --url https://...
```

**Process:**
1. Run capture script for each URL
2. Verify captured HTML loads in browser
3. Check that search/cart elements exist in HTML
4. Store raw files in `/raw/` subdirectory before sanitization

**File Structure:**
```
public/assets/previews/
├── stussy/
│   └── raw/
│       ├── home.html       # Raw captured HTML
│       ├── plp.html
│       └── pdp.html
└── new-era/
    └── raw/
        ├── home.html
        ├── plp.html
        └── pdp.html
```

**Acceptance:**
- 6 raw HTML files captured (2 sites × 3 pages)
- Each file loads correctly in standalone browser
- Search and cart elements present in HTML
- Files include all dynamically-loaded Shopify content
- Viewport captured at 1280px width

**Alternative Methods (Not Recommended):**
- Browser "Save Page As" - misses dynamically loaded content
- `curl`/`wget` - gets initial HTML only, misses JS-rendered content
- Manual copy/paste - tedious, error-prone

---

### Phase 1: Sanitization Tooling

**Goal:** Build automated HTML sanitization

- [ ] Create `src/scripts/sanitize-html.ts` CLI script
- [ ] Implement vendor script removal logic
- [ ] Preserve essential Shopify scripts in original order
- [ ] Implement link rewriting logic:
  - [ ] Rewrite logo links → `home.html`
  - [ ] Rewrite nav links → `plp.html`
  - [ ] Rewrite product links (on PLP) → `pdp.html`
  - [ ] Disable/remove external links (social, help, account, checkout)
  - [ ] Preserve search and cart functionality
- [ ] Add `<meta name="robots" content="noindex">` to output
- [ ] CLI interface: `bun run sanitize:html --site <site> --page <page>`
- [ ] Test on existing `stussy.html` homepage

**Acceptance:**
- Script removes all vendor tracking
- Preserves Shopify cart/search functionality
- Maintains script execution order
- All links rewritten to internal preview pages
- No external navigation possible
- Outputs clean HTML ready for iframe

---

### Phase 2: HTML Sanitization

**Goal:** Clean raw HTML files and remove tracking scripts

**Process:**

1. Run sanitization on captured files:
   ```bash
   bun run sanitize:html --site stussy --page home
   bun run sanitize:html --site stussy --page plp
   bun run sanitize:html --site stussy --page pdp
   bun run sanitize:html --site new-era --page home
   bun run sanitize:html --site new-era --page plp
   bun run sanitize:html --site new-era --page pdp
   ```

2. Script reads from `raw/` and writes to parent directory:
   - Input: `public/assets/previews/{site}/raw/{page}.html`
   - Output: `public/assets/previews/{site}/{page}.html`

3. Manual review of each sanitized file

4. Test each file in standalone browser

**Tasks:**
- [x] Sanitize Stussy homepage
- [x] Sanitize Stussy PLP
- [x] Sanitize Stussy PDP
- [x] Sanitize New Era homepage
- [x] Sanitize New Era PLP
- [x] Sanitize New Era PDP
- [x] Manual review and cleanup of all 6 files
- [x] Verify search functionality in each file
- [x] Verify cart functionality in each file

**Acceptance:**
- 6 sanitized HTML files total (2 sites × 3 pages)
- All files load without console errors
- Search and cart interactive in each file
- File sizes reduced 80-95% from original
- All vendor tracking scripts removed
- All links rewritten correctly:
  - Logo links navigate to `home.html`
  - Nav links navigate to `plp.html`
  - Product links (from PLP) navigate to `pdp.html`
  - External links disabled or removed
  - No navigation outside preview files

---

### Phase 3: InteractivePreview Component

**Goal:** Create iframe component with scaling and interaction modes

- [x] Create `InteractivePreview.tsx` component
- [x] Implement iframe with `srcdoc` attribute
- [x] Add `sandbox="allow-scripts allow-same-origin"`
- [x] CSS transform scaling: 1280px → ~400px
- [x] Lazy load HTML content (fetch on demand)
- [x] Two interaction modes:
  - **Default:** `pointer-events: none` (allows dragging computer)
  - **Focus mode:** Click screen to enable interaction, ESC to exit
- [x] Loading state while fetching HTML
- [x] Test with sanitized Stussy homepage

**Acceptance:**
- [x] Iframe renders sanitized HTML correctly
- [x] Scaling fits computer screen (Power Mac & iMac)
- [x] Can toggle between drag mode and interaction mode
- [x] No CORS errors
- [x] Lazy loading works on power-on

---

### Phase 4: Site Configuration

**Goal:** Centralize site/page configuration

- [x] Create `src/config/preview-sites.ts`
- [x] Define site structure:
  ```typescript
  {
    stussy: {
      name: 'Stüssy',
      viewportWidth: 1280,
      pages: {
        home: '/assets/previews/stussy/home.html',
        plp: '/assets/previews/stussy/plp.html',
        pdp: '/assets/previews/stussy/pdp.html',
      }
    },
    'new-era': { ... }
  }
  ```
- [x] Export TypeScript types for site/page keys

**Acceptance:**
- [x] Single source of truth for all sites/pages
- [x] Type-safe site and page references
- [x] Easy to add new sites in future

---

### Phase 5: Computer Component Integration

**Goal:** Wire InteractivePreview into existing computers with site cycling

**PowerMacintosh:**
- [x] Add `previewHtmlPath` and `previewViewportWidth` props (Phase 3)
- [x] Conditional render: `previewHtmlPath` → InteractivePreview, else → screenshot
- [x] Pass screen dimensions to InteractivePreview for scaling (334×244px)
- [x] Test with Stussy homepage

**IMacG4:**
- [x] Add `previewHtmlPath` and `previewViewportWidth` props (Phase 3)
- [x] Conditional render logic
- [x] Test with New Era homepage (344×214px)

**PreviewModeSection:**
- [x] Integrate preview-sites config
- [x] Add site state: `currentSite: SiteId`
- [x] Add site cycling via Up/Down arrow keys
- [x] Pass dynamic site/page via `getPreviewPath()` to computer components
- [x] Persist site state to localStorage
- [x] Update ArrowKeysController labels (Previous/Next site)

**Acceptance:**
- [x] Left/Right arrows cycle computers (existing)
- [x] Up/Down arrows cycle sites (Stussy ↔ New Era)
- [x] Correct HTML loads for each site (currently showing homepage)
- [x] State persists across page reloads

---

### Phase 6: SEO Protection

**Goal:** Prevent search engines from indexing preview assets

- [x] Update `public/robots.txt`:
  ```txt
  User-agent: *
  Disallow: /assets/previews/
  ```
- [x] Verify sitemap excludes `/assets/previews/` paths
- [x] Add `<meta name="robots" content="noindex, nofollow">` to all sanitized HTML
- [ ] Test with Google Search Console (if applicable)

**Acceptance:**
- [x] robots.txt blocks preview directory
- [x] Sanitized HTML has noindex meta tag
- [x] No preview pages in sitemap

---

### Phase 7: Multi-Site Testing & Polish

**Goal:** Ensure everything works across both sites and all pages

**Testing:**
- [ ] Test all 6 page combinations (2 sites × 3 pages)
- [ ] Verify search works on all pages
- [ ] Verify cart works on all pages
- [ ] Test link navigation:
  - [ ] Logo clicks navigate to homepage
  - [ ] Nav links navigate to PLP
  - [ ] Product cards (on PLP) navigate to PDP
  - [ ] Breadcrumbs work correctly
  - [ ] External links are disabled/don't navigate away
  - [ ] No navigation outside preview files
- [ ] Test interaction mode toggle on each page
- [ ] Test drag functionality when not interacting
- [ ] Test scrolling within iframe (both mouse wheel and touch-style drag)
- [ ] Performance test: measure load times, memory usage
- [ ] Console: verify no errors from removed scripts

**Polish:**
- [ ] Add transition animations for page cycling
- [ ] Loading spinner while HTML fetches
- [ ] Error handling for failed HTML loads
- [ ] Keyboard shortcuts help tooltip (optional)
- [ ] Optimize sanitized HTML file sizes

**Acceptance:**
- All pages load without errors
- Smooth transitions between sites/pages
- Interaction mode clearly indicated to user
- Performance acceptable (no lag when scaling)

---

### Phase 8: Testing & Documentation

**Goal:** Automated tests and developer documentation

- [ ] Write unit tests for `sanitizeHTML()` utility
- [ ] Write tests for InteractivePreview component
- [ ] Test script execution order preservation
- [ ] Document sanitization script usage in README
- [ ] Document how to add new sites/pages
- [ ] Add inline code comments for scaling logic
- [ ] Update CLAUDE.md with preview mode patterns (if needed)

**Acceptance:**
- Tests pass for sanitization logic
- Clear documentation for adding new sites
- Code comments explain non-obvious scaling math

---

## Open Questions

### 1. Sanitization Timing
**Question:** Build-time (Astro integration) or runtime (client-side)?
**Decision:** Manual sanitization script run locally, checked into git. No runtime processing.
**Rationale:** Simple, version-controlled, no client overhead.

### 2. Script Execution Order
**Question:** Do Shopify scripts have dependency order requirements?
**Research findings:**
- Shopify themes use `defer` attribute for async loading
- Scripts depend on `shopify-features` JSON in `<head>`
- Modern themes use `DOMContentLoaded` for init
- **Solution:** Preserve all script order, don't modify `defer` attributes

### 3. Interaction vs Drag
**Question:** How to handle iframe interaction while allowing computer drag?
**Solution:** Two-state model:
- **Default:** iframe has `pointer-events: none`, computer draggable
- **Focus mode:** Click screen to enable iframe interaction, ESC to exit
- Allows scroll wheel always, blocks clicks/drags unless focused

### 4. External Resources
**Question:** Allow external CSS/fonts from Shopify CDN?
**Decision:** Allow CDN resources, only remove script tags.
**Rationale:** Inlining CSS/fonts would bloat files, CDN is fast and reliable.

### 5. Page Navigation Controls
**Question:** How should users cycle through pages (home/PLP/PDP)?
**Proposal:** Up/Down arrow keys cycle pages, Left/Right cycle computers.
**Alternative:** Add UI buttons to ArrowKeysController for page navigation.

## Success Criteria

- [ ] Users can search products on Stussy and New Era
- [ ] Users can interact with shopping carts
- [ ] Previews look visually accurate to real sites
- [ ] File sizes reduced 80-95% from originals
- [ ] No CORS or security errors
- [ ] Search engines don't index preview assets
- [ ] Can drag computers when not in interaction mode
- [ ] Can scroll/click within iframe when in interaction mode

## Future Enhancements (Out of Scope)

- Add more sites beyond Stussy and New Era
- Capture more page types (account, checkout)
- Auto-update HTML snapshots periodically
- Add "live preview" mode that proxies real sites
- Mobile viewport support inside computers
- Multiple computers displayed simultaneously

## Commands

```bash
# Sanitize HTML files
bun run sanitize:html --site stussy --page home
bun run sanitize:html --site new-era --page plp

# Run tests
bun test

# Start dev server
bun run dev
```

## File Size Estimates

**Before sanitization:**
- stussy.html: 170KB
- new-era.html: 2.2MB

**After sanitization (estimated):**
- Each file: 10-50KB (90-95% reduction)
- Total for 6 pages: ~60-300KB

## Timeline

*No timeline estimates per instructions—tasks broken into actionable steps, user decides scheduling.*

---

## Notes

- Preserve Shopify script execution order to avoid breaking dependencies
- Use `srcdoc` instead of `src` to bypass CORS restrictions
- Sandbox attribute: `allow-scripts allow-same-origin` for security
- Target 1280px viewport (common laptop size)
- Scale factor: `screenWidth / 1280` for responsive fit
