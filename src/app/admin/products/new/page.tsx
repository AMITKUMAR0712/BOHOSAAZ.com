import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import ProductsClient from "@/app/[lang]/admin/products/ProductsClient";

export default async function AdminAddProductPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  return <ProductsClient mode="create" initialProducts={[]} />;
}
