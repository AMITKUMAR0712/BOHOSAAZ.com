import { prisma } from "@/lib/prisma";
import AdminLandingClient from "./_components/AdminLandingClient";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const setting = await prisma.setting.findUnique({
    where: { key: "adminLandingTheme" },
    select: { value: true },
  });

  const initialTheme = typeof setting?.value === "string" ? setting.value : "default";

  return <AdminLandingClient initialTheme={initialTheme} basePath="" />;
}
