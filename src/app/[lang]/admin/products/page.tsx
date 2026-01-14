import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import ProductsClient from "./ProductsClient";

export default async function AdminProductsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  return <ProductsClient initialProducts={[]} />;
}
