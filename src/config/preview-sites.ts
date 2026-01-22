/**
 * Configuration for interactive preview sites
 * Single source of truth for all site/page mappings
 */

export interface PreviewPage {
  /** Path to the sanitized HTML file */
  path: string;
  /** Display name for the page */
  name: string;
}

export interface PreviewSite {
  /** Display name for the site */
  name: string;
  /** Viewport width the HTML was captured at (px) */
  viewportWidth: number;
  /** Available pages for this site */
  pages: {
    home: PreviewPage;
    plp: PreviewPage;
    pdp: PreviewPage;
  };
}

export interface PreviewSitesConfig {
  stussy: PreviewSite;
  'new-era': PreviewSite;
}

/**
 * Preview sites configuration
 */
export const previewSites: PreviewSitesConfig = {
  stussy: {
    name: 'Stüssy',
    viewportWidth: 1280,
    pages: {
      home: {
        path: '/assets/previews/stussy/home.html',
        name: 'Homepage',
      },
      plp: {
        path: '/assets/previews/stussy/plp.html',
        name: 'Product Listing',
      },
      pdp: {
        path: '/assets/previews/stussy/pdp.html',
        name: 'Product Detail',
      },
    },
  },
  'new-era': {
    name: 'New Era',
    viewportWidth: 1280,
    pages: {
      home: {
        path: '/assets/previews/new-era/home.html',
        name: 'Homepage',
      },
      plp: {
        path: '/assets/previews/new-era/plp.html',
        name: 'Product Listing',
      },
      pdp: {
        path: '/assets/previews/new-era/pdp.html',
        name: 'Product Detail',
      },
    },
  },
};

/**
 * Type-safe site IDs
 */
export type SiteId = keyof PreviewSitesConfig;

/**
 * Type-safe page IDs
 */
export type PageId = keyof PreviewSite['pages'];

/**
 * All available site IDs as a constant array
 */
export const siteIds: SiteId[] = ['stussy', 'new-era'];

/**
 * All available page IDs as a constant array
 */
export const pageIds: PageId[] = ['home', 'plp', 'pdp'];

/**
 * Helper to get a site's configuration
 */
export function getSite(siteId: SiteId): PreviewSite {
  return previewSites[siteId];
}

/**
 * Helper to get a specific page configuration
 */
export function getPage(siteId: SiteId, pageId: PageId): PreviewPage {
  return previewSites[siteId].pages[pageId];
}

/**
 * Helper to get the HTML path for a specific site/page
 */
export function getPreviewPath(siteId: SiteId, pageId: PageId): string {
  return previewSites[siteId].pages[pageId].path;
}

/**
 * Helper to get viewport width for a site
 */
export function getViewportWidth(siteId: SiteId): number {
  return previewSites[siteId].viewportWidth;
}
