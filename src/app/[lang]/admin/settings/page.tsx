import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const rowsRaw = await prisma.setting.findMany({
    orderBy: { key: "asc" },
    select: { key: true, value: true, updatedAt: true },
  });

  const rows = rowsRaw.map((s) => ({
    ...s,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return <SettingsClient initialSettings={rows} />;
}
