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

## Implementation Phases

### Phase 1: Sanitization Tooling

**Goal:** Build automated HTML sanitization

- [ ] Create `src/scripts/sanitize-html.ts` CLI script
- [ ] Implement vendor script removal logic
- [ ] Preserve essential Shopify scripts in original order
- [ ] Add `<meta name="robots" content="noindex">` to output
- [ ] CLI interface: `bun run sanitize:html --site <site> --page <page>`
- [ ] Test on existing `stussy.html` homepage

**Acceptance:**
- Script removes all vendor tracking
- Preserves Shopify cart/search functionality
- Maintains script execution order
- Outputs clean HTML ready for iframe

---

### Phase 2: Content Collection & Sanitization

**Goal:** Gather and clean all page HTML

**Stussy:**
- [ ] Download homepage HTML (already have)
- [ ] Download PLP HTML (e.g., /collections/tees)
- [ ] Download PDP HTML (e.g., /products/example-tee)
- [ ] Run sanitization on all 3 pages
- [ ] Manual review and cleanup
- [ ] Verify search/cart work in standalone browser

**New Era:**
- [ ] Download homepage HTML (already have)
- [ ] Download PLP HTML (e.g., /collections/fitted-caps)
- [ ] Download PDP HTML (e.g., /products/example-cap)
- [ ] Run sanitization on all 3 pages
- [ ] Manual review and cleanup
- [ ] Verify search/cart work in standalone browser

**Acceptance:**
- 6 sanitized HTML files total (2 sites × 3 pages)
- All files load without console errors
- Search and cart interactive in each file
- File sizes reduced 80-95% from original

---

### Phase 3: InteractivePreview Component

**Goal:** Create iframe component with scaling and interaction modes

- [ ] Create `InteractivePreview.tsx` component
- [ ] Implement iframe with `srcdoc` attribute
- [ ] Add `sandbox="allow-scripts allow-same-origin"`
- [ ] CSS transform scaling: 1280px → ~400px
- [ ] Lazy load HTML content (fetch on demand)
- [ ] Two interaction modes:
  - **Default:** `pointer-events: none` (allows dragging computer)
  - **Focus mode:** Click screen to enable interaction, ESC to exit
- [ ] Loading state while fetching HTML
- [ ] Test with sanitized Stussy homepage

**Acceptance:**
- Iframe renders sanitized HTML correctly
- Scaling fits computer screen (Power Mac & iMac)
- Can toggle between drag mode and interaction mode
- No CORS errors
- Lazy loading works on power-on

---

### Phase 4: Site Configuration

**Goal:** Centralize site/page configuration

- [ ] Create `src/config/preview-sites.ts`
- [ ] Define site structure:
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
- [ ] Export TypeScript types for site/page keys

**Acceptance:**
- Single source of truth for all sites/pages
- Type-safe site and page references
- Easy to add new sites in future

---

### Phase 5: Computer Component Integration

**Goal:** Wire InteractivePreview into existing computers

**PowerMacintosh:**
- [ ] Add `previewSite?: 'stussy' | 'new-era'` prop
- [ ] Add `previewPage?: 'home' | 'plp' | 'pdp'` prop
- [ ] Conditional render: `previewSite` → InteractivePreview, else → screenshot
- [ ] Pass screen dimensions to InteractivePreview for scaling
- [ ] Test with Stussy homepage

**IMacG4:**
- [ ] Add same props as PowerMacintosh
- [ ] Conditional render logic
- [ ] Test with New Era homepage

**PreviewModeSection:**
- [ ] Add page state: `currentPage: 'home' | 'plp' | 'pdp'`
- [ ] Add page cycling via Up/Down arrow keys (or other keys)
- [ ] Pass `previewSite` and `previewPage` to computer components
- [ ] Persist page state to localStorage
- [ ] Update ArrowKeysController to show page navigation hint

**Acceptance:**
- Left/Right arrows cycle computers (existing)
- Up/Down arrows cycle pages (new)
- Correct HTML loads for each site/page combination
- State persists across page reloads

---

### Phase 6: SEO Protection

**Goal:** Prevent search engines from indexing preview assets

- [ ] Update `public/robots.txt`:
  ```txt
  User-agent: *
  Disallow: /assets/previews/
  ```
- [ ] Verify sitemap excludes `/assets/previews/` paths
- [ ] Add `<meta name="robots" content="noindex, nofollow">` to all sanitized HTML
- [ ] Test with Google Search Console (if applicable)

**Acceptance:**
- robots.txt blocks preview directory
- Sanitized HTML has noindex meta tag
- No preview pages in sitemap

---

### Phase 7: Multi-Site Testing & Polish

**Goal:** Ensure everything works across both sites and all pages

**Testing:**
- [ ] Test all 6 page combinations (2 sites × 3 pages)
- [ ] Verify search works on all pages
- [ ] Verify cart works on all pages
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
