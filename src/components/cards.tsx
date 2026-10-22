import Link from "next/link";
import { asset } from "@/lib/env";
import { authorOf, type Article, type Person } from "@/lib/content";
import { ARTICLE_TYPE_LABELS, STAFF_ROLE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { Portrait } from "./ui";

export function PersonCard({ person }: { person: Person }) {
  return (
    <Link href={`/people/${person.slug}`} className="person-card">
      <Portrait name={person.fullName} src={person.portrait} className="portrait" />
      <div className="person-card-body">
        <h3>{person.fullName}</h3>
        <span className="role">{person.title || STAFF_ROLE_LABELS[person.role]}</span>
        {person.status === "ON_LEAVE" && (
          <span>
            <span className="badge badge-warn">On leave</span>
          </span>
        )}
        <p>{person.shortBio}</p>
      </div>
    </Link>
  );
}

export function ArticleCard({ article, image }: { article: Article; image?: string }) {
  const author = authorOf(article);
  return (
    <Link href={`/news/${article.slug}`} className="article-card">
      {image && <img src={asset(image)} alt="" loading="lazy" />}
      <div className="meta-line">
        <span className="kind">{ARTICLE_TYPE_LABELS[article.type]}</span>
        <time dateTime={article.publishedOn}>{formatDate(article.publishedOn)}</time>
      </div>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      {author && <span className="small muted">By {author.name}</span>}
    </Link>
  );
}
