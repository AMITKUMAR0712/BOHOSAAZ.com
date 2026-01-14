"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BookOpenText,
  ClipboardList,
  HandCoins,
  Image,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Megaphone,
  Package,
  RotateCcw,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Tags,
  Ticket,
  Users,
} from "lucide-react";

export default function AdminSidebar({ lang }: { lang: string }) {
  const pathname = usePathname();
  const items = [
    { href: `/${lang}/admin`, label: "Dashboard" },
    { href: `/${lang}/admin/settings/site`, label: "Site Theme" },
    { href: `/${lang}/admin/settings`, label: "Settings" },
    { href: `/${lang}/admin/audit`, label: "Audit Logs" },
    { href: `/${lang}/admin/system`, label: "System" },
    { href: `/${lang}/admin/cms`, label: "CMS" },
    { href: `/${lang}/admin/pages`, label: "CMS Pages" },
    { href: `/${lang}/admin/users`, label: "Users" },
    { href: `/${lang}/admin/vendors`, label: "Vendors" },
    { href: `/${lang}/admin/orders`, label: "Orders" },
    { href: `/${lang}/admin/products`, label: "Products" },
    { href: `/${lang}/admin/brands`, label: "Brands" },
    { href: `/${lang}/admin/coupons`, label: "Coupons" },
    { href: `/${lang}/admin/blog`, label: "Blog" },
    { href: `/${lang}/admin/banners`, label: "Banners" },
    { href: `/${lang}/admin/ads`, label: "Ads" },
    { href: `/${lang}/admin/categories`, label: "Categories" },
    { href: `/${lang}/admin/payouts`, label: "Payouts" },
    { href: `/${lang}/admin/refunds`, label: "Refunds" },
    { href: `/${lang}/admin/support/tickets`, label: "Support Tickets" },
    { href: `/${lang}/admin/user-tickets`, label: "User Tickets" },
    { href: `/${lang}/admin/contact`, label: "Contact" },
  ];

  function iconForHref(href: string) {
    if (href.endsWith(`/admin`)) return <LayoutDashboard className="h-4 w-4" />;

    if (href.includes("/admin/settings/site")) return <Settings className="h-4 w-4" />;
    if (href.includes("/settings") || href.includes("/system")) return <Settings className="h-4 w-4" />;
    if (href.includes("/audit")) return <ClipboardList className="h-4 w-4" />;
    if (href.includes("/orders")) return <ShoppingCart className="h-4 w-4" />;

    if (href.includes("/products")) return <Package className="h-4 w-4" />;
    if (href.includes("/categories")) return <Tags className="h-4 w-4" />;
    if (href.includes("/users") || href.includes("/customers")) return <Users className="h-4 w-4" />;
    if (href.includes("/vendors") || href.includes("/brands") || href.includes("/payouts"))
      return <Store className="h-4 w-4" />;
    if (href.includes("/payouts")) return <HandCoins className="h-4 w-4" />;
    if (href.includes("/refunds")) return <RotateCcw className="h-4 w-4" />;
    if (href.includes("/support") || href.includes("/tickets") || href.includes("/user-tickets"))
      return <LifeBuoy className="h-4 w-4" />;
    if (href.includes("/contact")) return <Mail className="h-4 w-4" />;

    if (href.includes("/ads")) return <Megaphone className="h-4 w-4" />;
    if (href.includes("/coupons")) return <BadgePercent className="h-4 w-4" />;
    if (href.includes("/banners")) return <Image className="h-4 w-4" />;
    if (href.includes("/blog") || href.includes("/cms") || href.includes("/pages"))
      return <BookOpenText className="h-4 w-4" />;

    if (href.includes("/admin")) return <Shield className="h-4 w-4" />;
    return <Ticket className="h-4 w-4" />;
  }

  return (
    <aside className="w-64 border-r border-border bg-card p-4">
      <div className="text-sm font-semibold">Admin</div>
      <nav className="mt-4 flex flex-col gap-2 text-sm">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={
              (pathname === it.href || pathname.startsWith(it.href + "/")
                ? "bg-muted/60 text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40") +
              " rounded-(--radius) px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            }
          >
            <span className="inline-flex items-center gap-2">
              <span className="shrink-0" aria-hidden>
                {iconForHref(it.href)}
              </span>
              <span>{it.label}</span>
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
