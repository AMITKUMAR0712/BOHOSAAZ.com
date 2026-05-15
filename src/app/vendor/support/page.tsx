import { requireUser } from "@/lib/auth";
import SupportClient from "./SupportClient";

export default async function VendorSupportPage() {
  const user = await requireUser();
  if (!user || user.role !== "VENDOR") return null;

  return <SupportClient userId={user.id} />;
}
