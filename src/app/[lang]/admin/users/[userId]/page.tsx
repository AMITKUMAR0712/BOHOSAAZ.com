import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import UserDetailClient from "./UserDetailClient";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ lang: string; userId: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const { userId } = await params;
  return <UserDetailClient userId={userId} />;
}
