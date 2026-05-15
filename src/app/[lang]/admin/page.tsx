import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminLandingClient from "@/app/admin/_components/AdminLandingClient";

export const dynamic = "force-dynamic";

export default async function AdminHomePage({
	params,
}: {
	params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	const admin = await requireAdmin();
	if (!admin) return null;

	const setting = await prisma.setting.findUnique({
		where: { key: "adminLandingTheme" },
		select: { value: true },
	});
	const initialTheme = typeof setting?.value === "string" ? setting.value : "default";

	return (
		<div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
			<h1 className="text-2xl font-semibold">Admin Dashboard</h1>
			<p className="mt-1 text-sm text-muted-foreground">Live metrics update automatically.</p>
			<div className="mt-6">
				<AdminLandingClient initialTheme={initialTheme} basePath={`/${lang}`} />
			</div>
		</div>
	);
}
