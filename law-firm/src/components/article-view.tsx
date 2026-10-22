import Link from "next/link";
import { ARTICLE_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { publicAuthor, type ArticleCard } from "@/server/public";
import { Markdown } from "./ui";

type ArticleForView = ArticleCard & {
  body: string;
  practiceAreas: { slug: string; name: string }[];
};

/** Shared by the public article page and the admin preview. */
export function ArticleView({ article, timezone }: { article: ArticleForView; timezone: string }) {
  const author = publicAuthor(article.author);
  return (
    <article>
      <header className="article-header">
        <div className="meta-line" style={{ marginBottom: "1rem" }}>
          <span className="kind">{ARTICLE_TYPE_LABELS[article.type]}</span>
          {article.category && (
            <Link href={`/news?category=${article.category.slug}`}>{article.category.name}</Link>
          )}
          {article.publishedAt && (
            <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt, timezone)}</time>
          )}
        </div>
        <h1>{article.title}</h1>
        <p className="lead">{article.summary}</p>
        {author && (
          <p className="small muted">
            By {author.slug ? <Link href={`/people/${author.slug}`}>{author.name}</Link> : author.name}
          </p>
        )}
      </header>
      {article.featuredImageId && <img src={`/media/${article.featuredImageId}`} alt="" className="article-feature-image" />}
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
        {article.practiceAreas.length > 0 && (
          <p className="small">
            Related practice areas:{" "}
            {article.practiceAreas.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ", "}
                <Link href={`/practice-areas/${p.slug}`}>{p.name}</Link>
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
