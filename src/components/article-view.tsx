import Link from "next/link";
import { authorOf, categoryName, practiceArea, type Article } from "@/lib/content";
import { ARTICLE_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { Markdown } from "./ui";

export function ArticleView({ article }: { article: Article }) {
  const author = authorOf(article);
  const areas = article.practiceAreas.map(practiceArea).filter((a) => !!a);
  return (
    <article>
      <header className="article-header">
        <div className="meta-line" style={{ marginBottom: "1rem" }}>
          <span className="kind">{ARTICLE_TYPE_LABELS[article.type]}</span>
          <Link href={`/news?category=${article.category}`}>{categoryName(article.category)}</Link>
          <time dateTime={article.publishedOn}>{formatDate(article.publishedOn)}</time>
        </div>
        <h1>{article.title}</h1>
        <p className="lead">{article.summary}</p>
        {author && (
          <p className="small muted">
            By {author.slug ? <Link href={`/people/${author.slug}`}>{author.name}</Link> : author.name}
          </p>
        )}
      </header>
      <div style={{ marginTop: "2rem" }}>
        <Markdown>{article.body}</Markdown>
      </div>
      <footer style={{ marginTop: "2.5rem", maxWidth: "68ch" }} className="stack">
        {article.tags.length > 0 && (
          <div className="row" aria-label="Tags">
            {article.tags.map((t) => (
              <Link key={t} className="tag" href={`/news?tag=${encodeURIComponent(t)}`}>
                #{t}
              </Link>
            ))}
          </div>
        )}
        {areas.length > 0 && (
          <p className="small">
            Related practice areas:{" "}
            {areas.map((p, i) => (
              <span key={p!.slug}>
                {i > 0 && ", "}
                <Link href={`/practice-areas/${p!.slug}`}>{p!.name}</Link>
              </span>
            ))}
          </p>
        )}
        <div className="notice">
          <p>
            This article relates to the fictional GTA World roleplay setting. It is general information, not legal advice,
            and does not apply to any real-world jurisdiction.
          </p>
        </div>
      </footer>
    </article>
  );
}
