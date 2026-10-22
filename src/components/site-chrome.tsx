import Link from "next/link";
import { featuredPracticeAreas, site } from "@/lib/content";
import { timeZoneName } from "@/lib/time";
import { Brand } from "./brand";
import { MainNav, MobileMenu } from "./nav";

export function SiteHeader() {
  return (
    <>
      <div className="rp-banner">
        {site.firmName} is a fictional firm within the GTA World roleplay community. <Link href="/disclaimer">Read the disclaimer</Link>
      </div>
      <div className="utility-bar">
        <div className="container">
          <div className="row">
            <span>
              <span className="sr-only">Telephone: </span>
              {site.phone}
            </span>
            <span className="hide-sm">
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </span>
          </div>
          <div className="row">
            <Link href="/contact" className="hide-sm">
              Office hours · {timeZoneName(site.timezone)}
            </Link>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="container">
          <Brand firmName={site.firmName} shortName={site.shortName} logoUrl={null} />
          <MainNav links={site.navigation} />
          <div className="header-actions">
            <Link href="/contact" className="btn btn-primary btn-sm btn-header-cta">
              Contact the office
            </Link>
            <MobileMenu links={site.navigation} firmName={site.firmName} phone={site.phone} />
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand firmName={site.firmName} shortName={site.shortName} logoUrl={null} />
            <p style={{ marginTop: "1.25rem", maxWidth: "36ch" }}>{site.tagline}</p>
            <address style={{ fontStyle: "normal" }}>
              {site.addressLines.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </address>
            <p style={{ marginTop: "0.75rem" }}>
              {site.phone}
              <br />
              <a href={`mailto:${site.email}`}>{site.email}</a>
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
              {featuredPracticeAreas(6).map((p) => (
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
              <li><Link href="/contact">Contact &amp; office hours</Link></li>
              <li><a href={`mailto:${site.email}`}>Email the office</a></li>
              {site.socialLinks.map((s) => (
                <li key={s.href}>
                  <a href={s.href} rel="noopener noreferrer" target="_blank">{s.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-disclaimer">
          <p>{site.footerText}</p>
          <p className="row" style={{ gap: "1rem" }}>
            <span>© {year} {site.firmName} (fictional)</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
