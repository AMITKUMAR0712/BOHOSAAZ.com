"use client";

import { usePathname } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { DashboardCards } from "@/components/dashboard/DashboardCards";

export default function Account() {
  const pathname = usePathname();
  const seg = pathname.split("/").filter(Boolean)[0];
  const lang = seg && isLocale(seg) ? seg : "en";
  const lp = `/${lang}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live metrics update automatically.</p>

      <div className="mt-6">
        <DashboardCards role="user" basePath={lp} />
      </div>
    </div>
  );
}
