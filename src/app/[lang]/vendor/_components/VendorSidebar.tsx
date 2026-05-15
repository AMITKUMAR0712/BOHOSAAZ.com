"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function VendorSidebar({ lang }: { lang: string }) {
  const pathname = usePathname();
  const lp = `/${lang}`;

  const items = [
    { href: `${lp}/vendor`, label: "Dashboard" },
    { href: `${lp}/vendor/orders`, label: "Orders" },
    { href: `${lp}/vendor/products`, label: "Products" },
    { href: `${lp}/vendor/kyc`, label: "KYC" },
    { href: `${lp}/vendor/payouts`, label: "Payouts" },
    { href: `${lp}/vendor/support`, label: "Support (Admin Tickets)" },
    { href: `${lp}/vendor/settings`, label: "Settings" },
  ];

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:flex md:flex-col lg:grid-cols-1">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              active
                ? "block rounded-(--radius) border border-primary/50 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary shadow-sm"
                : "block rounded-(--radius) border border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all hover:shadow-sm"
            }
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
