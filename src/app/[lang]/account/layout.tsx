import { requireUser } from "@/lib/auth";
import AccountSidebar from "@/app/[lang]/account/_components/AccountSidebar";
import { redirect } from "next/navigation";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await requireUser();

  // Middleware should already protect /account, but keep a hard guard for safety.
  if (!user) redirect(`/${lang}/login?next=/${lang}/account`);

  if (user.role !== "USER") redirect("/403");

  const showVendorApply = !user.vendor || user.vendor.status !== "APPROVED";

  return (
    <div className="site-container mobile-bottom-safe py-5 md:py-10">
      <div className="mb-4 md:mb-6">
        <div className="text-2xl font-semibold">My Account</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Manage orders, returns, profile, and settings.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr] md:gap-6">
        <aside className="min-w-0">
          <AccountSidebar lang={lang} showVendorApply={showVendorApply} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
