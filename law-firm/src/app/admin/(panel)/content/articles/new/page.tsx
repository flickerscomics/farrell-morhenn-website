import { AdminHead } from "@/components/admin/panels";
import { can, requirePermission } from "@/server/auth";
import { ArticleForm } from "../article-form";
import { articleFormOptions } from "../data";

export const metadata = { title: "New article" };

export default async function NewArticle() {
  const staff = await requirePermission("content.articles");
  const opts = await articleFormOptions();
  return (
    <>
      <AdminHead back={{ href: "/admin/content/articles", label: "Articles" }} title="New article" description="New articles start as drafts." />
      <section className="panel">
        <ArticleForm
          {...opts}
          canPublish={can(staff, "content.publish")}
          values={{ title: "", slug: "", summary: "", body: "", type: "LEGAL_ARTICLE", categoryId: "", authorId: staff.staffProfileId ?? "", tags: "", metaDescription: "", isFeatured: false, featuredImageId: null, publishedAt: "", practiceAreaIds: [] }}
        />
      </section>
    </>
  );
}
