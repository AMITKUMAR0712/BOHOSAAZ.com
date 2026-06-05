"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarToggleButton } from "@/components/sidebar/Sidebar";
import { SidebarGroup } from "@/components/sidebar/SidebarGroup";
import { SidebarItem } from "@/components/sidebar/SidebarItem";
import { Button } from "@/components/ui/button";
import { CircleDollarSign, LayoutDashboard, Package, PlusSquare } from "lucide-react";

export default function VendorShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const router = useRouter();

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
    <div className="min-h-[calc(100vh-0px)] bg-background md:min-h-screen md:flex">
      <Sidebar title="Vendor" footer={footer}>
        <SidebarGroup title="Dashboard">
          <SidebarItem
            href="/vendor/dashboard"
            label="Dashboard"
            match="exact"
            icon={<LayoutDashboard className="h-4 w-4" />}
          />
        </SidebarGroup>

        <SidebarGroup title="All Products">
          <SidebarItem
            href="/vendor/products"
            label="All Products"
            match="exact"
            icon={<Package className="h-4 w-4" />}
          />
        </SidebarGroup>

        <SidebarGroup title="Create Product">
          <SidebarItem
            href="/vendor/products/new"
            label="Create Product"
            match="exact"
            icon={<PlusSquare className="h-4 w-4" />}
          />
        </SidebarGroup>

        <SidebarGroup title="Earnings">
          <SidebarItem
            href="/vendor/earnings"
            label="Earnings"
            match="exact"
            icon={<CircleDollarSign className="h-4 w-4" />}
          />
        </SidebarGroup>
      </Sidebar>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:px-6 md:py-3">
            <div className="md:hidden">
              <SidebarToggleButton />
            </div>
            <div className="flex-1">
              <div className="font-heading text-base md:text-lg tracking-tight">Vendor Panel</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={() => router.push("/vendor/products/new")}>
                Create Product
              </Button>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full px-3 py-3 mobile-bottom-safe sm:px-4 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
