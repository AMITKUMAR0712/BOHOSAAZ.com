import { prisma } from "@/lib/prisma";
import { normalizeCmsSlug } from "@/lib/cmsSlug";

export type CmsNavGroup = "about" | "contact" | "blog";

function navGroupForSlug(slug: string): CmsNavGroup | null {
  const s = normalizeCmsSlug(slug);
  if (!s.includes("/")) return null;
  const root = s.split("/")[0] || "";
  if (root === "about") return "about";
  if (root === "contact" || root === "contact-us") return "contact";
  if (root === "blog" || root === "blogs") return "blog";
  return null;
}

/** Public list of CMS pages for navbar dropdowns (nested slugs only). */
export async function GET() {
  const rows = await prisma.cmsPage.findMany({
    where: { slug: { contains: "/" } },
    orderBy: [{ title: "asc" }],
    select: { id: true, slug: true, title: true },
    take: 200,
  });

  const pages = rows
    .map((p) => {
      const group = navGroupForSlug(p.slug);
      if (!group) return null;
      return {
        id: p.id,
        slug: normalizeCmsSlug(p.slug),
        title: (p.title || "").trim() || normalizeCmsSlug(p.slug).split("/").pop() || "Page",
        group,
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return Response.json({ ok: true, pages });
}
