import Link from "next/link";
import { asset } from "@/lib/env";
import type { Article, Person, PressListItem } from "@/lib/types";
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
  return (
    <Link href={`/news/${article.slug}`} className="article-card">
      {image && <img src={asset(image)} alt="" loading="lazy" />}
      <div className="meta-line">
        <span className="kind">{ARTICLE_TYPE_LABELS[article.type]}</span>
        <time dateTime={article.publishedOn}>{formatDate(article.publishedOn)}</time>
      </div>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      {article.authorName && <span className="small muted">By {article.authorName}</span>}
    </Link>
  );
}

export function PressCard({ release, featured = false }: { release: PressListItem; featured?: boolean }) {
  return (
    <Link href={`/press/${release.slug}`} className={featured ? "press-card press-card-featured" : "press-card"}>
      <div className="meta-line">
        <span className="kind">{featured ? "Featured release" : release.categoryName}</span>
        <time dateTime={release.releaseDate}>{formatDate(release.releaseDate)}</time>
      </div>
      <h3>{release.title}</h3>
      <p>{release.summary}</p>
    </Link>
  );
}
