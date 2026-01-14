"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarToggleButton } from "@/components/sidebar/Sidebar";
import { SidebarGroup } from "@/components/sidebar/SidebarGroup";
import { SidebarItem } from "@/components/sidebar/SidebarItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BadgePercent,
  BookOpenText,
  CircleDollarSign,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  Package,
  PlusSquare,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Users,
} from "lucide-react";

type AdminBadges = {
  ordersPending: number;
  vendorsPending: number;
  payoutRequestsPending: number;
};

export default function AdminShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const router = useRouter();
  const [badges, setBadges] = React.useState<AdminBadges>({
    ordersPending: 0,
    vendorsPending: 0,
    payoutRequestsPending: 0,
  });

  function iconForHref(href: string) {
    if (href === "/admin") return <LayoutDashboard className="h-4 w-4" />;

    if (href.includes("/products/new")) return <PlusSquare className="h-4 w-4" />;
    if (href.includes("/products")) return <Package className="h-4 w-4" />;
    if (href.includes("/categories")) return <Tags className="h-4 w-4" />;

    if (href.includes("/orders")) return <ShoppingCart className="h-4 w-4" />;
    if (href.includes("/customers")) return <Users className="h-4 w-4" />;

    if (href.includes("/vendors")) return <Store className="h-4 w-4" />;
    if (href.includes("/payouts")) return <HandCoins className="h-4 w-4" />;

    if (href.includes("/cms") || href.includes("/blog")) return <BookOpenText className="h-4 w-4" />;
    if (href.includes("/coupons")) return <BadgePercent className="h-4 w-4" />;
    if (href.includes("/ads")) return <Megaphone className="h-4 w-4" />;

    if (href.includes("/commission")) return <CircleDollarSign className="h-4 w-4" />;
    if (href.includes("/settings")) return <Settings className="h-4 w-4" />;

    return <Settings className="h-4 w-4" />;
  }

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      const res = await fetch("/api/admin/badges", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as Partial<AdminBadges> | null;
      if (!mounted) return;
      if (!res.ok || !data) return;

      setBadges({
        ordersPending: typeof data.ordersPending === "number" ? data.ordersPending : 0,
        vendorsPending: typeof data.vendorsPending === "number" ? data.vendorsPending : 0,
        payoutRequestsPending:
          typeof data.payoutRequestsPending === "number" ? data.payoutRequestsPending : 0,
      });
    }

    load();
    const t = window.setInterval(load, 10_000);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  async function onLogout() {
    const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    const redirectTo = typeof data?.redirectTo === "string" ? data.redirectTo : "/en";
    router.push(redirectTo);
    router.refresh();
  }

  const footer = (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Logged in as</div>
      <div className="text-sm font-medium truncate">{userName}</div>
      <Button type="button" variant="outline" className="w-full" onClick={onLogout}>
        Logout
      </Button>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-0px)] md:min-h-screen md:flex">
      <Sidebar title="Admin" footer={footer}>
        <SidebarGroup title="Overview">
          <SidebarItem href="/admin" label="Dashboard" match="exact" icon={iconForHref("/admin")} />
        </SidebarGroup>

        <SidebarGroup title="Catalog">
          <SidebarItem
            href="/admin/products"
            label="All Products"
            match="exact"
            icon={iconForHref("/admin/products")}
          />
          <SidebarItem
            href="/admin/products/new"
            label="Add Product"
            match="exact"
            icon={iconForHref("/admin/products/new")}
          />
          <SidebarItem
            href="/admin/categories"
            label="Categories"
            match="exact"
            icon={iconForHref("/admin/categories")}
          />
        </SidebarGroup>

        <SidebarGroup title="Orders & Customers">
          <SidebarItem
            href="/admin/orders"
            label="All Orders"
            match="exact"
            icon={iconForHref("/admin/orders")}
            badge={badges.ordersPending}
          />
          <SidebarItem
            href="/admin/orders/customers"
            label="Customer Orders"
            match="exact"
            icon={iconForHref("/admin/orders/customers")}
          />
          <SidebarItem
            href="/admin/customers"
            label="Customers"
            match="exact"
            icon={iconForHref("/admin/customers")}
          />
        </SidebarGroup>

        <SidebarGroup title="Vendors">
          <SidebarItem
            href="/admin/vendors"
            label="Vendors List"
            match="exact"
            icon={iconForHref("/admin/vendors")}
            badge={badges.vendorsPending}
          />
          <SidebarItem
            href="/admin/payouts/requests"
            label="Payout Requests"
            match="exact"
            icon={iconForHref("/admin/payouts/requests")}
            badge={badges.payoutRequestsPending}
          />
          <SidebarItem
            href="/admin/payouts/history"
            label="Payout History"
            match="exact"
            icon={iconForHref("/admin/payouts/history")}
          />
        </SidebarGroup>

        <SidebarGroup title="Marketing">
          <SidebarItem href="/admin/cms" label="CMS" match="exact" icon={iconForHref("/admin/cms")} />
          <SidebarItem
            href="/admin/coupons"
            label="Coupons"
            match="exact"
            icon={iconForHref("/admin/coupons")}
          />
          <SidebarItem
            href="/admin/blog"
            label="Blog Posts"
            match="exact"
            icon={iconForHref("/admin/blog")}
          />
          <SidebarItem href="/admin/ads" label="Ads" match="exact" icon={iconForHref("/admin/ads")} />
        </SidebarGroup>

        <SidebarGroup title="Commission System">
          <SidebarItem
            href="/admin/commission/plans"
            label="Commission Plans"
            match="exact"
            icon={iconForHref("/admin/commission/plans")}
          />
          <SidebarItem
            href="/admin/commission/history"
            label="Commission History"
            match="exact"
            icon={iconForHref("/admin/commission/history")}
          />
        </SidebarGroup>

        <SidebarGroup title="Settings">
          <SidebarItem
            href="/admin/settings/site"
            label="Site Settings"
            match="exact"
            icon={iconForHref("/admin/settings/site")}
          />
        </SidebarGroup>
      </Sidebar>

      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="mx-auto w-full px-4 py-3 md:px-6 flex items-center gap-3">
            <div className="md:hidden">
              <SidebarToggleButton />
            </div>

            <div className="flex-1 flex items-center gap-3">
              <div className="hidden lg:block w-105 max-w-full">
                <Input placeholder="Search (optional)" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => router.push("/admin/products/new")}>
                Add Product
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/admin/settings/site")}> 
                Site Settings
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/admin/coupons")}>
                Create Coupon
              </Button>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
