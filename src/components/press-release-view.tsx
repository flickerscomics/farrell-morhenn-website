import Link from "next/link";
import { mediaContactFor, people, practiceArea, pressCategoryName, site, type PressRelease } from "@/lib/content";
import { asset } from "@/lib/env";
import { formatDate } from "@/lib/time";
import { BBCode } from "./bbcode";
import { ReleaseActions } from "./release-actions";

type Contact = ReturnType<typeof mediaContactFor>;

export function MediaContact({ contact }: { contact: Contact }) {
  return (
    <div className="card media-contact">
      <h3 style={{ fontSize: "1.1rem" }}>Media contact</h3>
      <p style={{ margin: 0 }}>
        <strong>{contact.slug ? <Link href={`/people/${contact.slug}`}>{contact.name}</Link> : contact.name}</strong>
        {contact.title && (
          <>
            <br />
            <span className="small muted">{contact.title}</span>
          </>
        )}
      </p>
      <dl className="contact-block" style={{ margin: "0.75rem 0 0" }}>
        {contact.email && (
          <>
            <dt>Email</dt>
            <dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd>
          </>
        )}
        {contact.phone && (
          <>
            <dt>Telephone</dt>
            <dd>{contact.phone}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

export function PressReleaseView({ release: r, url }: { release: PressRelease; url: string }) {
  const named = r.people.map((slug) => people().find((p) => p.slug === slug)).filter((p) => !!p);
  const areas = r.practiceAreas.map(practiceArea).filter((a) => !!a);
  const boilerplate = r.showBoilerplate ? r.boilerplate || site.press.boilerplate : "";
  return (
    <div className="split split-aside press-release-layout">
      <article className="press-release">
        <header className="article-header">
          <p className="release-line">{r.releaseLine}</p>
          <div className="meta-line" style={{ marginBottom: "1rem" }}>
            <span className="kind">Press release</span>
            <Link href={`/press?category=${r.category}`}>{pressCategoryName(r.category)}</Link>
            <time dateTime={r.releaseAt}>{formatDate(r.releaseDate)}</time>
          </div>
          <h1>{r.title}</h1>
          {r.subtitle && <p className="lead">{r.subtitle}</p>}
        </header>
        {r.status === "ARCHIVED" && (
          <div className="notice notice-info" style={{ marginTop: "1.5rem" }}>
            <p>This press release has been archived. It is kept for reference and may no longer be current.</p>
          </div>
        )}
        {r.updatedOn && (
          <div className="notice" style={{ marginTop: "1.5rem" }}>
            <p>
              <strong>Updated {formatDate(r.updatedOn)}</strong>
              {r.updateNote && <>: {r.updateNote}</>}
            </p>
          </div>
        )}
        {r.image && (
          <figure className="release-figure">
            <img src={asset(r.image)} alt={r.imageAlt} />
            {r.imageCaption && <figcaption>{r.imageCaption}</figcaption>}
          </figure>
        )}
        <p className="dateline">
          <strong>{r.location}</strong> — {formatDate(r.releaseDate)} —
        </p>
        <BBCode>{r.body}</BBCode>
        <p className="end-mark" aria-label="End of release">###</p>
        {boilerplate && (
          <section className="release-boilerplate" aria-label={`About ${site.firmName}`}>
            <BBCode>{boilerplate}</BBCode>
          </section>
        )}
        {r.tags.length > 0 && (
          <div className="row" aria-label="Tags" style={{ marginTop: "1.5rem" }}>
            {r.tags.map((t) => (
              <Link key={t} className="tag" href={`/press?tag=${encodeURIComponent(t)}`}>
                #{t}
              </Link>
            ))}
          </div>
        )}
      </article>
      <aside className="stack release-aside">
        <ReleaseActions title={r.title} url={url} />
        {r.pullQuote && (
          <figure className="pull-quote">
            <blockquote>“{r.pullQuote}”</blockquote>
            {r.pullQuoteBy && <figcaption>{r.pullQuoteBy}</figcaption>}
          </figure>
        )}
        <MediaContact contact={mediaContactFor(r)} />
        {r.attachments.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: "1.1rem" }}>Downloads</h3>
            <ul className="list-check">
              {r.attachments.map((a) => (
                <li key={a.file}>
                  <a href={asset(a.file)} download>
                    {a.label}
                  </a>{" "}
                  <span className="small muted">({a.file.split(".").pop()!.toUpperCase()})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(named.length > 0 || areas.length > 0) && (
          <dl className="profile-meta">
            {named.length > 0 && (
              <div>
                <dt>People in this release</dt>
                <dd>
                  <ul className="list-check">
                    {named.map((p) => (
                      <li key={p!.slug}>
                        <Link href={`/people/${p!.slug}`}>{p!.fullName}</Link>, {p!.title}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {areas.length > 0 && (
              <div>
                <dt>Practice areas</dt>
                <dd>
                  <ul className="list-check">
                    {areas.map((a) => (
                      <li key={a!.slug}>
                        <Link href={`/practice-areas/${a!.slug}`}>{a!.name}</Link>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        )}
      </aside>
    </div>
  );
}
