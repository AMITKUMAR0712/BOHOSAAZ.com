"use client";

import * as React from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SidebarGroup } from "@/components/sidebar/SidebarGroup";
import { SidebarItem } from "@/components/sidebar/SidebarItem";
import {
  BadgePercent,
  BookOpenText,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  Package,
  PlusSquare,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Users,
} from "lucide-react";

export type PanelNavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
  badge?: number;
};

export type PanelNavGroup = {
  title: string;
  items: PanelNavItem[];
};

export function PanelSidebar({
  title,
  nav,
}: {
  title: string;
  nav: PanelNavGroup[];
}) {
  function iconForHref(href: string) {
    if (href === "/admin" || href === "/vendor/dashboard") return <LayoutDashboard className="h-4 w-4" />;

    if (href.includes("/products/new")) return <PlusSquare className="h-4 w-4" />;
    if (href.includes("/products")) return <Package className="h-4 w-4" />;
    if (href.includes("/categories")) return <Tags className="h-4 w-4" />;
    if (href.includes("/brands")) return <Store className="h-4 w-4" />;

    if (href.includes("/orders")) return <ShoppingCart className="h-4 w-4" />;
    if (href.includes("/customers") || href.includes("/users")) return <Users className="h-4 w-4" />;
    if (href.includes("/vendors")) return <Store className="h-4 w-4" />;
    if (href.includes("/payouts")) return <HandCoins className="h-4 w-4" />;
    if (href.includes("/earnings")) return <CircleDollarSign className="h-4 w-4" />;
    if (href.includes("/kyc")) return <ShieldCheck className="h-4 w-4" />;

    if (href.includes("/ads")) return <Megaphone className="h-4 w-4" />;
    if (href.includes("/coupons")) return <BadgePercent className="h-4 w-4" />;
    if (href.includes("/blog") || href.includes("/cms") || href.includes("/pages"))
      return <BookOpenText className="h-4 w-4" />;

    if (href.includes("/refunds") || href.includes("/returns")) return <Receipt className="h-4 w-4" />;
    if (href.includes("/payments")) return <CreditCard className="h-4 w-4" />;
    if (href.includes("/settings")) return <Settings className="h-4 w-4" />;

    return null;
  }

  return (
    <Sidebar title={title}>
      {nav.map((group) => (
        <SidebarGroup key={group.title} title={group.title}>
          {group.items.map((it) => (
            <SidebarItem
              key={it.href}
              href={it.href}
              label={it.label}
              icon={iconForHref(it.href)}
              match={it.match ?? "prefix"}
              badge={it.badge}
            />
          ))}
        </SidebarGroup>
      ))}
    </Sidebar>
  );
}
