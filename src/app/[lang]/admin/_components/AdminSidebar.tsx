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
  const [isOpen, setIsOpen] = React.useState(false);

  const items = [
    // ... items stay the same ...
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
    <>
      {/* Mobile Toggle */}
      <div className="fixed bottom-4 right-4 z-50 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        >
          {isOpen ? <Shield className="h-6 w-6 rotate-45 transition-transform" /> : <Shield className="h-6 w-6" />}
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Admin Portal</div>
        </div>
        <nav className="flex flex-col gap-1 p-2 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-hide">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                pathname === it.href || pathname.startsWith(it.href + "/")
                  ? "bg-primary text-primary-foreground shadow-md font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                {iconForHref(it.href)}
              </span>
              <span className="truncate">{it.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
