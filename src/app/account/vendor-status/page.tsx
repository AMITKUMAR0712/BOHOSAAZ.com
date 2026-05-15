import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type VendorStatus = "NOT_APPLIED" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

const vendorStatusLabels: Record<VendorStatus, string> = {
  NOT_APPLIED: "Not applied",
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

const vendorStatusMessages: Record<VendorStatus, string> = {
  NOT_APPLIED: "You have not yet applied to become a vendor. Start your application to join the marketplace.",
  PENDING: "Your application is pending review. An admin will review your submission soon.",
  APPROVED: "Your vendor application is approved. Refresh access on the application page to activate the vendor panel.",
  REJECTED: "Your application was rejected. Update your details and resubmit for a new review.",
  SUSPENDED: "Your vendor account is suspended. Contact support for assistance and next steps.",
};

const vendorStatusClasses: Record<VendorStatus, string> = {
  NOT_APPLIED: "border-border bg-muted text-muted-foreground",
  PENDING: "border-amber-200 bg-amber-50 text-amber-900",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-900",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-900",
  SUSPENDED: "border-slate-200 bg-slate-50 text-slate-900",
};

export default async function VendorStatusPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const user = await requireUser();

  if (!user) return null;

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      statusReason: true,
      shopName: true,
      kyc: {
        select: {
          status: true,
          rejectionReason: true,
        },
      },
    },
  });

  const status = (vendor?.status ?? "NOT_APPLIED") as VendorStatus;
  const actionLabel =
    status === "APPROVED"
      ? "View application & refresh access"
      : status === "PENDING"
      ? "View application"
      : status === "REJECTED"
      ? "Resubmit application"
      : "Apply now";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Vendor Request Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review your marketplace onboarding progress and next steps.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor request</CardTitle>
          <CardDescription>Track your application status and take the next action.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="text-sm text-muted-foreground">Current status</div>
              <div className="mt-1 text-2xl font-semibold">{vendorStatusLabels[status]}</div>
            </div>
            <span className={`self-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${vendorStatusClasses[status]}`}>
              {vendorStatusLabels[status]}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">{vendorStatusMessages[status]}</div>

          {vendor?.statusReason ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="font-semibold">Admin note</div>
              <div>{vendor.statusReason}</div>
            </div>
          ) : null}

          {vendor?.kyc?.rejectionReason ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <div className="font-semibold">KYC rejection reason</div>
              <div>{vendor.kyc.rejectionReason}</div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${lang}/account/vendor-apply`}
              className="inline-flex items-center justify-center rounded-(--radius) bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95"
            >
              {actionLabel}
            </Link>
            {status === "APPROVED" ? (
              <Link href={`/${lang}/vendor`} className="text-sm underline">
                Open Vendor Panel
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
