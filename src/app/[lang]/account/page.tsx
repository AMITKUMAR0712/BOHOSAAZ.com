import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardCards } from "@/components/dashboard/DashboardCards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type VendorStatus = "NOT_APPLIED" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

function getVendorStatusLabel(status: VendorStatus) {
	return {
		NOT_APPLIED: "Not applied",
		PENDING: "Pending review",
		APPROVED: "Approved",
		REJECTED: "Rejected",
		SUSPENDED: "Suspended",
	}[status];
}

function getVendorStatusMessage(status: VendorStatus) {
	return {
		NOT_APPLIED: "You have not yet applied to become a vendor. Start your application now.",
		PENDING: "Your vendor application is pending review. An admin will review it soon.",
		APPROVED: "Your vendor application is approved. Refresh access on the vendor application page to activate the Vendor Panel.",
		REJECTED: "Your vendor application was rejected. Update the form and resubmit.",
		SUSPENDED: "Your vendor account is suspended. Contact support for next steps.",
	}[status];
}

function getVendorStatusBadgeClasses(status: VendorStatus) {
	return {
		NOT_APPLIED: "border-border bg-muted text-muted-foreground",
		PENDING: "border-amber-200 bg-amber-50 text-amber-900",
		APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-900",
		REJECTED: "border-rose-200 bg-rose-50 text-rose-900",
		SUSPENDED: "border-slate-200 bg-slate-50 text-slate-900",
	}[status];
}

export default async function AccountDashboard({
	params,
}: {
	params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	const user = await requireUser();
	if (!user) {
		// Middleware should redirect already.
		return null;
	}

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

	const vendorStatus = (vendor?.status ?? "NOT_APPLIED") as VendorStatus;
	const vendorStatusLabel = getVendorStatusLabel(vendorStatus);
	const showVendorCard = true;
	const statusMessage = getVendorStatusMessage(vendorStatus);
	const badgeClasses = getVendorStatusBadgeClasses(vendorStatus);

	return (
		<div className="mx-auto max-w-6xl px-4 py-2 md:py-4">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<p className="mt-1 text-sm text-muted-foreground">Live metrics update automatically.</p>

			{showVendorCard ? (
				<div className="mt-6">
					<Card>
						<CardHeader>
							<div className="flex flex-col gap-1">
								<CardTitle>Vendor Request Status</CardTitle>
								<CardDescription>Track your marketplace onboarding progress here.</CardDescription>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-[1fr_auto]">
								<div>
									<div className="text-sm text-muted-foreground">Status</div>
									<div className="mt-1 text-lg font-semibold">{vendorStatusLabel}</div>
								</div>
								<div className="self-center">
									<span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${badgeClasses}`}>
										{vendorStatusLabel}
									</span>
								</div>
							</div>

							<div className="text-sm text-muted-foreground">{statusMessage}</div>

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
									href={`/${lang}/account/vendor-status`}
									className="inline-flex items-center justify-center rounded-(--radius) bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95"
								>
									{vendorStatus === "APPROVED" ? "Open Vendor Access" : vendorStatus === "PENDING" ? "View Application" : vendorStatus === "REJECTED" ? "Resubmit Application" : "Apply Now"}
								</Link>
								{vendorStatus === "APPROVED" ? (
									<Link href={`/${lang}/vendor`} className="text-sm underline">Go to Vendor Panel after refresh</Link>
								) : null}
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			<div className="mt-6">
				<DashboardCards role="user" basePath={`/${lang}`} />
			</div>
		</div>
	);
}

