import Link from "next/link";
import { ARTICLE_TYPE_LABELS, STAFF_ROLE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { publicAuthor, type ArticleCard as ArticleCardData, type StaffCard } from "@/server/public";
import { Portrait } from "./ui";

export function PersonCard({ person }: { person: StaffCard }) {
  return (
    <Link href={`/people/${person.slug}`} className="person-card">
      <Portrait name={person.fullName} portraitId={person.portraitId} className="portrait" />
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

export function ArticleCard({ article, timezone }: { article: ArticleCardData; timezone: string }) {
  const author = publicAuthor(article.author);
  return (
    <Link href={`/news/${article.slug}`} className="article-card">
      {article.featuredImageId && <img src={`/media/${article.featuredImageId}`} alt="" loading="lazy" />}
      <div className="meta-line">
        <span className="kind">{ARTICLE_TYPE_LABELS[article.type]}</span>
        {article.publishedAt && <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt, timezone)}</time>}
      </div>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      {author && <span className="small muted">By {author.name}</span>}
    </Link>
  );
}
