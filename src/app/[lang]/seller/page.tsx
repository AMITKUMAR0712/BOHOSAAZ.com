import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Seller | Bohosaaz",
  description:
    "Become a Bohosaaz seller and list gift products for Noida, Greater Noida, New Delhi and Delhi NCR customers looking for premium online gifts.",
  keywords: ["sell gifts online", "Bohosaaz seller", "gift products seller Noida", "Delhi NCR gifting marketplace"],
};

export default async function SellerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) throw new Error("Invalid locale");

  const lp = `/${lang}`;
  const me = await requireUser();

  if (!me) {
    redirect(`${lp}/login?next=${encodeURIComponent(`${lp}/seller`)}`);
  }

  if (me.role === "ADMIN") {
    redirect(`${lp}/admin`);
  }

  if (!me.vendor) {
    redirect(`${lp}/account/vendor-apply`);
  }

  if (me.vendor?.status === "APPROVED") {
    redirect(`${lp}/vendor`);
  }

  const status = me.vendor.status;
  const statusCopy =
    status === "PENDING"
      ? {
          title: "Vendor application pending",
          description: "Admin approval is required before you can access products and the full vendor dashboard.",
          tone: "text-amber-700",
          message: "Your shop details and KYC are submitted. You can check this page until approval is complete.",
        }
      : status === "REJECTED"
        ? {
            title: "Vendor application needs changes",
            description: "Admin rejected the current application. Please update and resubmit your details.",
            tone: "text-danger",
            message: "Review the rejection reason on the application page and submit corrected details.",
          }
        : {
            title: "Vendor access unavailable",
            description: "Your vendor access is not active right now.",
            tone: "text-muted-foreground",
            message: "Contact support or update your vendor application.",
          };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <Card className="overflow-hidden rounded-[32px] border-primary/15 bg-card/90 shadow-premium">
        <CardHeader className="border-b border-border/70 bg-linear-to-br from-primary/10 via-background/60 to-amber-500/10 p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.24em] text-primary">Vendor Dashboard</div>
          <CardTitle className="mt-2 font-heading text-3xl">{statusCopy.title}</CardTitle>
          <CardDescription className="max-w-2xl text-base">{statusCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-border bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Shop</div>
              <div className="mt-2 font-semibold">{me.vendor.shopName || "Vendor shop"}</div>
            </div>
            <div className="rounded-3xl border border-border bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</div>
              <div className={`mt-2 font-semibold ${statusCopy.tone}`}>{status}</div>
            </div>
            <div className="rounded-3xl border border-border bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Access</div>
              <div className="mt-2 font-semibold text-muted-foreground">Locked until approval</div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-background/70 p-5 text-sm text-muted-foreground">
            {statusCopy.message}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`${lp}/account/vendor-apply`}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
            >
              {status === "REJECTED" ? "Update application" : "View application"}
            </Link>
            <Link
              href={`${lp}/account/support`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-semibold transition hover:bg-muted/50"
            >
              Contact support
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
