import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import AuditClient from "./AuditClient";

export default async function AdminAuditPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  return <AuditClient />;
}
