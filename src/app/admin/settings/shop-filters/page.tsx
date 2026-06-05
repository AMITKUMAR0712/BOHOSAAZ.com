import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeShopFilterConfig,
  SHOP_FILTERS_SETTING_KEY,
} from "@/lib/shopFilters";
import ShopFiltersClient from "./ShopFiltersClient";

export const dynamic = "force-dynamic";

export default async function AdminShopFiltersPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const setting = await prisma.setting.findUnique({
    where: { key: SHOP_FILTERS_SETTING_KEY },
    select: { value: true },
  });

  const config = normalizeShopFilterConfig(setting?.value);

  return <ShopFiltersClient initialConfig={config} />;
}
