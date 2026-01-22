/**
 * Shared CLI utilities for preview scripts
 */

import { siteIds, pageIds, type SiteId, type PageId } from '../../config/preview-sites';

export interface BaseOptions {
  site: SiteId;
  page: PageId;
}

/**
 * Validates that a value is a valid SiteId
 */
function isValidSite(value: string): value is SiteId {
  return siteIds.includes(value as SiteId);
}

/**
 * Validates that a value is a valid PageId
 */
function isValidPage(value: string): value is PageId {
  return pageIds.includes(value as PageId);
}

/**
 * Parses --site and --page arguments from CLI
 */
export function parseBaseArgs(): { site?: SiteId; page?: PageId; verbose: boolean } {
  const args = process.argv.slice(2);
  let site: SiteId | undefined;
  let page: PageId | undefined;
  const verbose = args.includes('--verbose');

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--site' && nextArg) {
      if (!isValidSite(nextArg)) {
        throw new Error(`Invalid site: ${nextArg}. Must be one of: ${siteIds.join(', ')}`);
      }
      site = nextArg;
      i++;
    } else if (arg === '--page' && nextArg) {
      if (!isValidPage(nextArg)) {
        throw new Error(`Invalid page: ${nextArg}. Must be one of: ${pageIds.join(', ')}`);
      }
      page = nextArg;
      i++;
    }
  }

  return { site, page, verbose };
}

/**
 * Gets --url argument from CLI
 */
export function getUrlArg(): string | undefined {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      return args[i + 1];
    }
  }

  return undefined;
}

/**
 * Prints usage and exits if required args are missing
 */
export function requireArgs<T extends BaseOptions>(
  args: Partial<T>,
  usage: string
): asserts args is T {
  if (!args.site || !args.page) {
    console.error(usage);
    process.exit(1);
  }
}
