import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteSettingsClient from "./SiteSettingsClient";

export const dynamic = "force-dynamic";

type HomeThemeId =
  | "studio"
  | "market"
  | "commerce"
  | "noir"
  | "atlas"
  | "heritage"
  | "mono";

function normalizeHomeTheme(v: unknown): HomeThemeId {
  return v === "studio" ||
    v === "market" ||
    v === "commerce" ||
    v === "noir" ||
    v === "atlas" ||
    v === "heritage" ||
    v === "mono"
    ? v
    : "studio";
}

export default async function AdminSiteSettingsPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const setting = await prisma.setting.findUnique({
    where: { key: "homeTheme" },
    select: { value: true },
  });

  return <SiteSettingsClient initialHomeTheme={normalizeHomeTheme(setting?.value)} />;
}
