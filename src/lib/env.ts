// Values that can be supplied at build time. The site is hosted at the root of
// farrell-morhenn.com (Cloudflare Pages), so neither needs setting there.

/** Path prefix the site is served under, e.g. "/farrell-morhenn-website" ("" at a domain root). */
export const BASE_PATH = (process.env.PAGES_BASE_PATH ?? "").replace(/\/+$/, "");

/** Absolute site URL used for canonical links, the sitemap and social metadata. */
export const SITE_URL = (process.env.SITE_URL || "https://farrell-morhenn.com").replace(/\/+$/, "");

/** Prefixes a public asset path (for plain <img>/<a> elements that bypass next/link). */
export function asset(path: string) {
  return `${BASE_PATH}${path}`;
}
