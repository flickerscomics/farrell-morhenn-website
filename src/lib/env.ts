// Values supplied at build time. On GitHub Pages the deploy workflow sets
// both from the repository's Pages configuration, so renaming the repository
// needs no code change.

/** Path prefix the site is served under, e.g. "/farrell-morhenn-website" ("" at a domain root). */
export const BASE_PATH = (process.env.PAGES_BASE_PATH ?? "").replace(/\/+$/, "");

/** Absolute site URL used for canonical links, the sitemap and social metadata. */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Prefixes a public asset path (for plain <img>/<a> elements that bypass next/link). */
export function asset(path: string) {
  return `${BASE_PATH}${path}`;
}
