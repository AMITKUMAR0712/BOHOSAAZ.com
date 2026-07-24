import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardCards } from "@/components/dashboard/DashboardCards";

function vendorStatusCopy(status: string | null | undefined) {
  if (status === "PENDING") {
    return {
      title: "Vendor request is pending",
      description: "Admin approval is required before you can access the vendor dashboard.",
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-800",
      action: "View application status",
      href: "/account/vendor-status",
    };
  }
  if (status === "REJECTED") {
    return {
      title: "Vendor request was rejected",
      description: "Update your details and KYC, then resubmit the application.",
      tone: "border-danger/30 bg-danger/10 text-danger",
      action: "Update application / KYC",
      href: "/account/vendor-apply",
    };
  }
  if (status === "APPROVED") {
    return {
      title: "Vendor account approved",
      description: "You can manage products and orders from the vendor dashboard.",
      tone: "border-success/30 bg-success/10 text-success",
      action: "Go to vendor dashboard",
      href: "/account/activate-vendor?next=/vendor/dashboard",
    };
  }
  return {
    title: "Sell on Bohosaaz",
    description: "Complete vendor application and KYC to start selling gifts on Bohosaaz.",
    tone: "border-primary/25 bg-primary/5 text-foreground",
    action: "Become a Vendor",
    href: "/account/vendor-apply",
  };
}

export default async function Account() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=/account`);

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      statusReason: true,
      shopName: true,
      kyc: { select: { status: true, rejectionReason: true } },
    },
  });

  const status = vendorStatusCopy(vendor?.status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live metrics update automatically.</p>

      <div className="mt-6">
        <DashboardCards role="user" basePath="/en" />
      </div>

      <div className={`mt-6 overflow-hidden rounded-[28px] border p-5 shadow-sm ${status.tone}`}>
        <div className="text-xs uppercase tracking-[0.22em] opacity-80">Sell on Bohosaaz</div>
        <h2 className="mt-2 text-xl font-semibold">{status.title}</h2>
        <p className="mt-1 max-w-2xl text-sm opacity-90">{status.description}</p>
        {vendor?.shopName ? (
          <div className="mt-3 text-sm">
            Shop: <span className="font-semibold">{vendor.shopName}</span>
          </div>
        ) : null}
        {vendor?.statusReason ? (
          <div className="mt-2 text-sm text-danger">Reason: {vendor.statusReason}</div>
        ) : null}
        {vendor?.kyc?.rejectionReason ? (
          <div className="mt-1 text-sm text-danger">KYC Reason: {vendor.kyc.rejectionReason}</div>
        ) : null}
        <Link
          href={status.href}
          className="mt-4 inline-flex rounded-full border border-current/20 bg-background/70 px-4 py-2 text-sm font-semibold transition hover:bg-background"
        >
          {status.action}
        </Link>
      </div>
    </div>
  );
}
