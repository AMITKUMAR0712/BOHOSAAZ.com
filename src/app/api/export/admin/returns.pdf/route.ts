import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildPdfBuffer, pdfDownloadResponse, renderTable } from "@/lib/export/pdf";
import { buildCreatedAtRange, formatIsoDateTime, todayIsoDate } from "@/lib/export/format";
import { ReturnRequestStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = buildCreatedAtRange(url.searchParams);
  const status = (url.searchParams.get("status") || "").trim();

  const where: Prisma.ReturnRequestWhereInput = {
    ...(range ? { createdAt: range } : {}),
  };
  if (status && status !== "ALL") {
    if ((Object.values(ReturnRequestStatus) as string[]).includes(status)) {
      where.status = status as ReturnRequestStatus;
    }
  }

  const returns = await prisma.returnRequest.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 2000,
    select: {
      id: true,
      status: true,
      orderId: true,
      updatedAt: true,
      user: { select: { email: true } },
      vendor: { select: { shopName: true } },
      orderItem: { select: { quantity: true, product: { select: { title: true } } } },
    },
  });

  const rows = returns.map((rr) => ({
    returnId: rr.id,
    updatedAt: formatIsoDateTime(rr.updatedAt),
    status: rr.status,
    orderId: rr.orderId,
    userEmail: rr.user.email,
    vendor: rr.vendor.shopName,
    product: rr.orderItem.product.title,
    qty: rr.orderItem.quantity,
  }));

  const pdf = await buildPdfBuffer(
    (doc) => {
      renderTable(
        doc,
        [
          { key: "returnId", label: "Return", width: 140 },
          { key: "updatedAt", label: "Updated (ISO)", width: 150 },
          { key: "status", label: "Status", width: 60 },
          { key: "orderId", label: "Order", width: 120 },
          { key: "userEmail", label: "User", width: 120 },
          { key: "vendor", label: "Vendor", width: 110 },
          { key: "product", label: "Product", width: 160 },
          { key: "qty", label: "Qty", width: 30, align: "right" },
        ],
        rows,
        { rowHeight: 20 }
      );
    },
    { title: "Bohosaaz — Admin Returns Export", subtitle: "" }
  );

  const filename = `Bohosaaz_Admin_Returns_${todayIsoDate()}.pdf`;
  return pdfDownloadResponse(filename, pdf);
}
