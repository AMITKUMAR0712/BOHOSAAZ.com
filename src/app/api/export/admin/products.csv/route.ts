import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvDownloadResponse, toCsvWithHeaders } from "@/lib/export/csv";
import { formatIsoDateTime, todayIsoDate } from "@/lib/export/format";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      vendorId: true,
      title: true,
      slug: true,
      sku: true,
      price: true,
      salePrice: true,
      stock: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      vendor: { select: { shopName: true } },
    },
  });

  const headers = [
    "productId",
    "vendorId",
    "vendorShopName",
    "title",
    "slug",
    "sku",
    "category",
    "brand",
    "price",
    "salePrice",
    "stock",
    "isActive",
    "createdAt",
    "updatedAt",
  ];

  const rows = products.map((p) => ({
    productId: p.id,
    vendorId: p.vendorId,
    vendorShopName: p.vendor.shopName,
    title: p.title,
    slug: p.slug,
    sku: p.sku || "",
    category: p.category?.name || "",
    brand: p.brand?.name || "",
    price: p.price,
    salePrice: p.salePrice ?? "",
    stock: p.stock,
    isActive: p.isActive ? "true" : "false",
    createdAt: formatIsoDateTime(p.createdAt),
    updatedAt: formatIsoDateTime(p.updatedAt),
  }));

  const csv = toCsvWithHeaders(headers, rows);
  const filename = `Bohosaaz_Admin_Products_${todayIsoDate()}.csv`;
  return csvDownloadResponse(filename, csv);
}
