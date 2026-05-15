import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import ExportDropdown from "@/components/ExportDropdown";

function paymentMode(orderStatus: string) {
	return orderStatus === "PAID" ? "Paid" : "COD";
}

export default async function AccountOrdersPage({
	params,
}: {
	params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	const user = await requireUser();
	if (!user) return null;

	const orders = await prisma.order.findMany({
		where: { userId: user.id, status: { not: "PENDING" } },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			createdAt: true,
			total: true,
			status: true,
		},
	});

	return (
		<div className="grid gap-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="text-xl font-semibold">Order history</div>
					<div className="mt-1 text-sm text-gray-600">All your placed orders.</div>
				</div>
				<ExportDropdown
					filenameBase="Bohosaaz_Orders"
					csv={{ href: "/api/export/user/orders.csv" }}
					pdf={{ href: "/api/export/user/orders.pdf" }}
				/>
			</div>

			<div className="rounded-2xl border overflow-hidden">
				<div className="bg-gray-50 p-4 text-sm font-semibold">Orders</div>

				<div className="p-4 grid gap-3">
					{orders.map((o) => (
						<div key={o.id} className="rounded-xl border p-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<div className="text-sm font-semibold">Order #{o.id}</div>
									<div className="mt-1 text-xs text-gray-600">
										{new Date(o.createdAt).toLocaleString()} • {paymentMode(o.status)}
									</div>
								</div>

								<div className="text-right">
									<div className="text-sm">
										Status: <b>{o.status}</b>
									</div>
									<div className="text-sm">
										Total: <b>₹{o.total}</b>
									</div>
								</div>
							</div>

							<div className="mt-3">
								<Link
									className="inline-block rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
									href={`/${lang}/account/orders/${o.id}`}
								>
									View details
								</Link>
							</div>
						</div>
					))}

					{orders.length === 0 ? (
						<div className="rounded-xl border p-4 text-sm text-gray-600">No orders yet.</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

