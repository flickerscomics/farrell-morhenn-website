import type { NextConfig } from "next";

// Static export for GitHub Pages. The deploy workflow sets PAGES_BASE_PATH
// (e.g. "/farrell-morhenn-website") from the repository's Pages settings.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
