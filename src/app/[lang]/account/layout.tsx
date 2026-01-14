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

  const showVendorApply = !user.vendor;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6">
        <div className="text-2xl font-semibold">My Account</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Manage orders, returns, profile, and security.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside>
          <AccountSidebar lang={lang} showVendorApply={showVendorApply} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
