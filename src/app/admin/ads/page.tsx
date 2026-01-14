import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdsClient from "./AdsClient";

export default async function AdminAdsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/403");

  const ads = await prisma.ad.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  return <AdsClient initialAds={ads} />;
}
