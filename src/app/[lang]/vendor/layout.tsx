import { requireUser } from "@/lib/auth";
import VendorSidebar from "@/app/[lang]/vendor/_components/VendorSidebar";
import { redirect } from "next/navigation";

export default async function VendorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await requireUser();

  // Middleware should already protect /vendor, but keep a hard guard for safety.
  if (!user) redirect(`/${lang}/login?next=/${lang}/vendor`);

  if (user.role !== "VENDOR") redirect("/403");

  // Vendor must be approved to access /vendor.
  if (user.vendor?.status !== "APPROVED") redirect(`/${lang}/account/vendor-apply`);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6">
        <div className="text-2xl font-semibold">Vendor Panel</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Manage products and fulfill orders. Customer contact is handled by Admin tickets only.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside>
          <VendorSidebar lang={lang} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
