import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireApprovedVendor } from "@/lib/auth";
import ExportDropdown from "@/components/ExportDropdown";

function maskName(name: string | null | undefined) {
  const n = String(name || "").trim();
  if (!n) return null;
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  if (!first) return null;
  const masked = first.length <= 1 ? "*" : first[0] + "*".repeat(Math.min(6, first.length - 1));
  return masked;
}

function maskPincode(pincode: string | null | undefined) {
  const p = String(pincode || "").trim();
  if (!p) return null;
  if (p.length <= 2) return "**";
  return "*".repeat(p.length - 2) + p.slice(-2);
}

export default async function VendorReturnsPage() {
  const vendorUser = await requireApprovedVendor();
  if (!vendorUser) redirect("/403");

  const vendorId = vendorUser.vendor!.id;

  const returns = await prisma.returnRequest.findMany({
    where: { vendorId },
    include: {
      order: { select: { id: true, createdAt: true, status: true, fullName: true, city: true, state: true, pincode: true } },
      orderItem: { select: { quantity: true, price: true, product: { select: { title: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Returns</div>
          <div className="mt-1 text-sm text-muted-foreground">Approve requests and manage pickup. Customer contact details are hidden.</div>
        </div>
        <ExportDropdown
          filenameBase="Bohosaaz_VendorReturns"
          csv={{ href: "/api/export/vendor/returns.csv" }}
          pdf={{ href: "/api/export/vendor/returns.pdf" }}
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-muted/30 p-3 text-sm font-semibold">{returns.length} requests</div>
        <div className="divide-y">
          {returns.map((r) => {
            const amount = r.orderItem.price * r.orderItem.quantity;
            return (
              <div key={r.id} className="p-4 grid gap-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{r.orderItem.product.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Return #{r.id} • Order #{r.order.id} • ₹{amount}</div>
                  </div>
                  <Link className="text-sm underline" href={`/vendor/returns/${r.id}`}>
                    View
                  </Link>
                </div>

                <div className="text-xs">
                  Status: <b>{r.status}</b> • Shipping: {maskName(r.order.fullName) || "—"} • {r.order.city || "—"}, {r.order.state || "—"} • {maskPincode(r.order.pincode) || "—"}
                </div>

                <div className="text-xs text-muted-foreground">Updated: {new Date(r.updatedAt).toLocaleString()}</div>
              </div>
            );
          })}

          {returns.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No return requests.</div> : null}
        </div>
      </div>
    </div>
  );
}
