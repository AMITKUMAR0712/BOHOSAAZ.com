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

  const [themeSetting, imageSetting] = await Promise.all([
    prisma.setting.findUnique({
      where: { key: "homeTheme" },
      select: { value: true },
    }),
    prisma.setting.findUnique({
      where: { key: "categorySectionImages" },
      select: { value: true },
    }),
  ]);

  const categorySectionImages = Array.isArray(imageSetting?.value)
    ? imageSetting.value.filter((item): item is string => typeof item === "string").slice(0, 3)
    : [];

  return (
    <SiteSettingsClient
      initialHomeTheme={normalizeHomeTheme(themeSetting?.value)}
      initialCategorySectionImages={categorySectionImages}
    />
  );
}
