import Link from "next/link";
import type { Settings } from "@/server/settings";
import { timeZoneName, WEEKDAY_NAMES, zonedParts } from "@/lib/time";
import { Brand } from "./brand";
import { MainNav, MobileMenu } from "./nav";

export function todayHoursLabel(settings: Settings, now = new Date()) {
  const { weekday } = zonedParts(now, settings.timezone);
  const day = settings.officeHours[weekday];
  return day.closed ? `Closed today (${WEEKDAY_NAMES[weekday]})` : `Open today ${day.open}–${day.close}`;
}

export function SiteHeader({ settings }: { settings: Settings }) {
  return (
    <>
      <div className="rp-banner">
        {settings.firmName} is a fictional firm within the GTA World roleplay community.{" "}
        <Link href="/disclaimer">Read the disclaimer</Link>
      </div>
      <div className="utility-bar">
        <div className="container">
          <div className="row">
            <span>
              <span className="sr-only">Telephone: </span>
              {settings.phone}
            </span>
            <span className="hide-sm">
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </span>
          </div>
          <div className="row">
            <span className="hide-sm">{todayHoursLabel(settings)} · {timeZoneName(settings.timezone)}</span>
            <Link href="/portal">Client portal</Link>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="container">
          <Brand firmName={settings.firmName} shortName={settings.shortName} logoUrl={settings.logoUrl} />
          <MainNav links={settings.navigation} />
          <div className="header-actions">
            <Link href="/consultation" className="btn btn-primary btn-sm btn-header-cta">
              Request a consultation
            </Link>
            <MobileMenu links={settings.navigation} firmName={settings.firmName} phone={settings.phone} />
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ settings, practiceAreas }: { settings: Settings; practiceAreas: { slug: string; name: string }[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand firmName={settings.firmName} shortName={settings.shortName} logoUrl={settings.logoUrl} />
            <p style={{ marginTop: "1.25rem", maxWidth: "36ch" }}>{settings.tagline}</p>
            <address style={{ fontStyle: "normal" }}>
              {settings.addressLines.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </address>
            <p style={{ marginTop: "0.75rem" }}>
              {settings.phone}
              <br />
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </p>
          </div>
          <div>
            <h2>The firm</h2>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/people">People</Link></li>
              <li><Link href="/news">News &amp; insights</Link></li>
              <li><Link href="/careers">Careers</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h2>Practice areas</h2>
            <ul>
              {practiceAreas.slice(0, 6).map((p) => (
                <li key={p.slug}>
                  <Link href={`/practice-areas/${p.slug}`}>{p.name}</Link>
                </li>
              ))}
              <li><Link href="/practice-areas">All practice areas</Link></li>
            </ul>
          </div>
          <div>
            <h2>Get in touch</h2>
            <ul>
              <li><Link href="/consultation">Request a consultation</Link></li>
              <li><Link href="/enquiry">Make an enquiry</Link></li>
              <li><Link href="/contact">Contact &amp; office hours</Link></li>
              <li><Link href="/portal">Client portal</Link></li>
              {settings.socialLinks.map((s) => (
                <li key={s.href}>
                  <a href={s.href} rel="noopener noreferrer" target="_blank">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-disclaimer">
          <p>{settings.footerText}</p>
          <p className="row" style={{ gap: "1rem" }}>
            <span>© {year} {settings.firmName} (fictional)</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
            <Link href="/admin/login">Staff sign-in</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
