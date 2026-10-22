import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/auth";
import { articleCardSelect } from "@/server/public";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Article preview", robots: { index: false } };

export default async function PreviewArticle({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content.articles");
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: { ...articleCardSelect, status: true, body: true, practiceAreas: { select: { slug: true, name: true } } },
  });
  if (!article) notFound();
  const settings = await getSettings();
  return (
    <>
      <div className="notice notice-info" style={{ marginBottom: "1.5rem" }}>
        <p>Preview of a {article.status.toLowerCase()} article. <Link href={`/admin/content/articles/${id}`}>Back to the editor</Link></p>
      </div>
      <div className="panel" style={{ padding: "2rem" }}>
        <ArticleView article={article} timezone={settings.timezone} />
      </div>
    </>
  );
}
