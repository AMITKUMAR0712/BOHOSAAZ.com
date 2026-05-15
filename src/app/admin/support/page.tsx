import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function AdminSupportPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  redirect("/admin/support/tickets");
}
