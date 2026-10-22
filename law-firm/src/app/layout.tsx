import type { Metadata, Viewport } from "next";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { Toaster } from "@/components/client-ui";
import { env } from "@/lib/env";
import { getSettings } from "@/server/settings";

// Content is managed in the database and edited live through the admin
// area, so pages render per request rather than at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: `${s.firmName} — ${s.tagline}`, template: `%s | ${s.firmName}` },
    description: s.heroText.slice(0, 160),
    applicationName: s.firmName,
    openGraph: { type: "website", siteName: s.firmName, locale: "en_US" },
    twitter: { card: "summary" },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#15233b",
  width: "device-width",
  initialScale: 1,
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const primary = HEX.test(s.colorPrimary) ? s.colorPrimary : "#15233b";
  const accent = HEX.test(s.colorAccent) ? s.colorAccent : "#a8864f";
  return (
    <html lang="en">
      <head>
        {/* Colours are validated as six-digit hex values before injection. */}
        <style dangerouslySetInnerHTML={{ __html: `:root{--brand-primary:${primary};--brand-accent:${accent}}` }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
