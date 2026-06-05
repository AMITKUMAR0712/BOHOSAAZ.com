import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import ProductsClient from "@/app/[lang]/admin/products/ProductsClient";
import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  // Load products server-side so admin sees all vendor products immediately
  const rowsRaw = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      currency: true,
      mrp: true,
      price: true,
      salePrice: true,
      stock: true,
      status: true,
      isActive: true,
      forceCodOnly: true,
      isFeatured: true,
      isTrending: true,
      createdAt: true,
      vendor: { select: { id: true, shopName: true, status: true } },
      category: { select: { id: true, name: true } },
      images: { select: { id: true, url: true, isPrimary: true }, orderBy: { createdAt: "asc" } },
    },
  });

  const rows = rowsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return <ProductsClient initialProducts={rows} />;
}
