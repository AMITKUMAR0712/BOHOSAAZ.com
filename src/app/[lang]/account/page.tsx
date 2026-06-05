import { DashboardCards } from "@/components/dashboard/DashboardCards";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function vendorStatusCopy(status: string | null | undefined) {
	if (status === "PENDING") {
		return {
			label: "Pending",
			title: "Vendor request is pending",
			description: "Admin approval is required before you can access vendor products and dashboard.",
			tone: "border-amber-500/30 bg-amber-500/10 text-amber-800",
			action: "View submitted application",
		};
	}
	if (status === "REJECTED") {
		return {
			label: "Rejected",
			title: "Vendor request was rejected",
			description: "Please review the reason, update your details, and resubmit the application.",
			tone: "border-danger/30 bg-danger/10 text-danger",
			action: "Update application",
		};
	}
	if (status === "APPROVED") {
		return {
			label: "Approved",
			title: "Vendor request approved",
			description: "Your vendor account is approved. You can now access the vendor dashboard.",
			tone: "border-success/30 bg-success/10 text-success",
			action: "Go to vendor dashboard",
		};
	}
	return null;
}

export default async function AccountDashboard({
	params,
}: {
	params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	const user = await requireUser();
	if (!user) redirect(`/${lang}/login?next=/${lang}/account`);

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
		<div className="mx-auto max-w-6xl px-4 py-2 md:py-4">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<p className="mt-1 text-sm text-muted-foreground">Live metrics update automatically.</p>

			<div className="mt-6">
				<DashboardCards role="user" basePath={`/${lang}`} />
			</div>

			{status ? (
				<div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-card/90 shadow-sm">
					<div className="flex flex-wrap items-start justify-between gap-4 p-5">
						<div className="min-w-0">
							<div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Become a Vendor</div>
							<h2 className="mt-2 text-xl font-semibold">{status.title}</h2>
							<p className="mt-1 max-w-2xl text-sm text-muted-foreground">{status.description}</p>
							{vendor?.shopName ? (
								<div className="mt-3 text-sm">
									Shop: <span className="font-semibold">{vendor.shopName}</span>
								</div>
							) : null}
							{vendor?.statusReason ? <div className="mt-2 text-sm text-danger">Reason: {vendor.statusReason}</div> : null}
							{vendor?.kyc?.rejectionReason ? <div className="mt-1 text-sm text-danger">KYC Reason: {vendor.kyc.rejectionReason}</div> : null}
						</div>
						<div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
							<div className={`rounded-full border px-4 py-2 text-sm font-semibold ${status.tone}`}>
								{status.label}
							</div>
							<Link
								href={vendor?.status === "APPROVED" ? `/${lang}/vendor` : `/${lang}/account/vendor-apply`}
								className="inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
							>
								{status.action}
							</Link>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

