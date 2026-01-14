import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminCmsHub({ params }: { params: Promise<{ lang: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { lang } = await params;

  const sections = [
    {
      href: `/${lang}/admin/pages`,
      title: "CMS Pages",
      description: "Static pages like About, Privacy, Terms.",
    },
    {
      href: `/${lang}/admin/blog`,
      title: "Blog",
      description: "Manage blog posts and content.",
    },
    {
      href: `/${lang}/admin/banners`,
      title: "Banners",
      description: "Homepage and promotional banners.",
    },
    {
      href: `/${lang}/admin/coupons`,
      title: "Coupons",
      description: "Discount codes and promotions.",
    },
    {
      href: `/${lang}/admin/ads`,
      title: "Ads",
      description: "Ads placements, scheduling, and tracking.",
    },
    {
      href: `/${lang}/admin/contact`,
      title: "Contact",
      description: "Contact form submissions.",
    },
  ];

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">CMS</h1>
          <p className="text-sm text-muted-foreground">Manage site content and marketing surfaces.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="block">
              <Card className="h-full hover:bg-muted/30 transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-primary underline">Open →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
