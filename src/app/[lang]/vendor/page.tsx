import { requireUser } from "@/lib/auth";
import { DashboardCards } from "@/components/dashboard/DashboardCards";

export default async function VendorHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	const user = await requireUser();
	if (!user || !user.vendor) {
		// VendorLayout handles redirects; this is a defensive fallback.
		return null;
	}

	return (
		<div className="mx-auto max-w-6xl px-4 py-2 md:py-4">
			<h1 className="text-2xl font-semibold">Vendor Dashboard</h1>
			<p className="mt-1 text-sm text-muted-foreground">Live metrics update automatically.</p>
			<div className="mt-6">
				<DashboardCards role="vendor" basePath={`/${lang}`} />
			</div>
		</div>
	);
}

