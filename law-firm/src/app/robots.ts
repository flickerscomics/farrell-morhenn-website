import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/api", "/files", "/confirmation"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
