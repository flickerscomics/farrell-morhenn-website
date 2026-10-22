import Link from "next/link";
import { ArticleCard, PersonCard } from "@/components/cards";
import { HeroArt } from "@/components/hero-art";
import { Markdown, OfficeHoursTable } from "@/components/ui";
import { prisma } from "@/lib/db";
import { timeZoneName } from "@/lib/time";
import {
  articleCardSelect,
  getPage,
  pageSections,
  publicStaffWhere,
  publishedArticleWhere,
  staffCardSelect,
} from "@/server/public";
import { getSettings } from "@/server/settings";

export default async function HomePage() {
  const settings = await getSettings();
  const show = settings.homeSections;
  const [home, areas, people, articles, openVacancies] = await Promise.all([
    getPage("home"),
    prisma.practiceArea.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      select: { slug: true, name: true, shortDescription: true },
      take: 6,
    }),
    prisma.staffProfile.findMany({
      where: { ...publicStaffWhere, isFeatured: true },
      orderBy: { sortOrder: "asc" },
      select: staffCardSelect,
      take: 4,
    }),
    prisma.article.findMany({
      where: publishedArticleWhere(),
      orderBy: { publishedAt: "desc" },
      select: articleCardSelect,
      take: 3,
    }),
    prisma.vacancy.count({ where: { status: "OPEN" } }),
  ]);
  const steps = pageSections(home?.sections);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            {settings.heroEyebrow && <p className="eyebrow">{settings.heroEyebrow}</p>}
            <h1>{settings.heroTitle}</h1>
            <p className="lead">{settings.heroText}</p>
            <div className="hero-actions">
              <Link href="/consultation" className="btn btn-accent">
                Request a consultation
              </Link>
              <Link href="/enquiry" className="btn btn-light">
                Make an enquiry
              </Link>
            </div>
            <p className="hero-links">
              Not sure where your matter fits? <Link href="/practice-areas">Explore our practice areas</Link>.
            </p>
          </div>
          <div className="hero-art">
            <HeroArt />
          </div>
        </div>
      </section>

      {home && (
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
      )}

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

      {show.showAttorneys && people.length > 0 && (
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
              {people.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {show.showProcess && steps.length > 0 && (
        <section className="section section-dark">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Working with us</p>
                <h2>From first enquiry to representation</h2>
              </div>
              <Link href="/faq" className="link-arrow">
                Common questions
              </Link>
            </div>
            <ol className="steps">
              {steps.map((s, i) => (
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

      {show.showArticles && articles.length > 0 && (
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
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} timezone={settings.timezone} />
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
                {openVacancies > 0
                  ? `${openVacancies} open ${openVacancies === 1 ? "position" : "positions"} for attorneys and support staff.`
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
              <h2>{settings.addressLines[0]}</h2>
              <address style={{ fontStyle: "normal" }} className="lead">
                {settings.addressLines.slice(1).map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </address>
              {settings.locationNote && <p className="muted" style={{ marginTop: "1rem" }}>{settings.locationNote}</p>}
              <dl className="contact-block" style={{ marginTop: "1.5rem" }}>
                <dt>Telephone</dt>
                <dd>{settings.phone} (in character)</dd>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${settings.email}`}>{settings.email}</a>
                </dd>
              </dl>
              <div className="row">
                <Link href="/contact" className="btn btn-secondary">
                  Contact details
                </Link>
                <Link href="/enquiry" className="btn btn-primary">
                  Make an enquiry
                </Link>
              </div>
            </div>
            <div className="card">
              <h3>Office hours</h3>
              <p className="small muted">All times are {timeZoneName(settings.timezone)} ({settings.timezone}).</p>
              <OfficeHoursTable hours={settings.officeHours} timezone={settings.timezone} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
