import type { Metadata, Viewport } from "next";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SITE_URL } from "@/lib/env";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: { default: `${site.firmName} — ${site.tagline}`, template: `%s | ${site.firmName}` },
  description: site.heroText.slice(0, 160),
  applicationName: site.firmName,
  openGraph: { type: "website", siteName: site.firmName, locale: "en_US" },
  twitter: { card: "summary" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = { themeColor: site.colorPrimary, width: "device-width", initialScale: 1 };

const HEX = /^#[0-9a-fA-F]{6}$/;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const primary = HEX.test(site.colorPrimary) ? site.colorPrimary : "#15233b";
  const accent = HEX.test(site.colorAccent) ? site.colorAccent : "#a8864f";
  return (
    <html lang="en">
      <head>
        {/* Brand colours from content/site.ts, validated as hex before injection. */}
        <style dangerouslySetInnerHTML={{ __html: `:root{--brand-primary:${primary};--brand-accent:${accent}}` }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
