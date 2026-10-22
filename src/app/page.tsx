import Link from "next/link";
import { ArticleCard, PersonCard } from "@/components/cards";
import { HeroArt } from "@/components/hero-art";
import { Markdown, OfficeHoursTable } from "@/components/ui";
import { absoluteUrl, articles, featuredPracticeAreas, openVacancies, page, people, site } from "@/lib/content";
import { timeZoneName } from "@/lib/time";

export const metadata = { alternates: { canonical: absoluteUrl("/") } };

export default function HomePage() {
  const show = site.homeSections;
  const home = page("home");
  const areas = featuredPracticeAreas(6);
  const featured = people().filter((p) => p.isFeatured).slice(0, 4);
  const latest = articles().slice(0, 3);
  const vacancyCount = openVacancies().length;

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            {site.heroEyebrow && <p className="eyebrow">{site.heroEyebrow}</p>}
            <h1>{site.heroTitle}</h1>
            <p className="lead">{site.heroText}</p>
            <div className="hero-actions">
              <Link href="/contact" className="btn btn-accent">
                Contact the office
              </Link>
              <Link href="/practice-areas" className="btn btn-light">
                Explore practice areas
              </Link>
            </div>
            <p className="hero-links">
              Prefer to speak to someone? Call <strong style={{ color: "white" }}>{site.phone}</strong> in character.
            </p>
          </div>
          <div className="hero-art">
            <HeroArt />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <p className="eyebrow">{home.summary || "Our approach"}</p>
            <h2>{home.title}</h2>
            <Link href="/about" className="link-arrow">
              About the firm
            </Link>
          </div>
          <Markdown className="prose">{home.body}</Markdown>
        </div>
      </section>

      {show.showPracticeAreas && areas.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Practice areas</p>
                <h2>How we can help</h2>
              </div>
              <Link href="/practice-areas" className="link-arrow">
                All practice areas
              </Link>
            </div>
            <div className="practice-list">
              {areas.map((a) => (
                <Link key={a.slug} href={`/practice-areas/${a.slug}`} className="practice-item">
                  <h3>{a.name}</h3>
                  <p>{a.shortDescription}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {show.showAttorneys && featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Our people</p>
                <h2>Attorneys you will work with</h2>
                <p>Every matter has a named attorney who is responsible for it from start to finish.</p>
              </div>
              <Link href="/people" className="link-arrow">
                Meet the whole team
              </Link>
            </div>
            <div className="grid grid-4">
              {featured.map((p) => (
                <PersonCard key={p.slug} person={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {show.showProcess && home.sections.length > 0 && (
        <section className="section section-dark">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Working with us</p>
                <h2>From first contact to representation</h2>
              </div>
              <Link href="/faq" className="link-arrow">
                Common questions
              </Link>
            </div>
            <ol className="steps">
              {home.sections.map((s, i) => (
                <li key={i}>
                  <span className="feature-number">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{s.heading}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {show.showArticles && latest.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">News &amp; insights</p>
                <h2>From the firm</h2>
              </div>
              <Link href="/news" className="link-arrow">
                All articles
              </Link>
            </div>
            <div className="grid grid-3">
              {latest.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {show.showCareers && (
        <section className="section-tight section-alt">
          <div className="container row row-between">
            <div>
              <p className="eyebrow">Careers</p>
              <h2 style={{ marginBottom: "0.4rem" }}>Build your practice with us</h2>
              <p className="muted" style={{ margin: 0 }}>
                {vacancyCount > 0
                  ? `${vacancyCount} open ${vacancyCount === 1 ? "position" : "positions"} for attorneys and support staff.`
                  : "No open positions right now, but we welcome general applications."}
              </p>
            </div>
            <Link href="/careers" className="btn btn-primary">
              View careers
            </Link>
          </div>
        </section>
      )}

      {show.showContact && (
        <section className="section">
          <div className="container split-even split">
            <div>
              <p className="eyebrow">Visit the office</p>
              <h2>{site.addressLines[0]}</h2>
              <address style={{ fontStyle: "normal" }} className="lead">
                {site.addressLines.slice(1).map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </address>
              {site.locationNote && <p className="muted" style={{ marginTop: "1rem" }}>{site.locationNote}</p>}
              <dl className="contact-block" style={{ marginTop: "1.5rem" }}>
                <dt>Telephone</dt>
                <dd>{site.phone} (in character)</dd>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </dd>
              </dl>
              <Link href="/contact" className="btn btn-primary">
                Contact details
              </Link>
            </div>
            <div className="card">
              <h3>Office hours</h3>
              <p className="small muted">
                All times are {timeZoneName(site.timezone)} ({site.timezone}).
              </p>
              <OfficeHoursTable hours={site.officeHours} timezone={site.timezone} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
