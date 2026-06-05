"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, SidebarToggleButton } from "@/components/sidebar/Sidebar";
import { SidebarGroup } from "@/components/sidebar/SidebarGroup";
import { SidebarItem } from "@/components/sidebar/SidebarItem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type DashboardNavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
  badge?: number;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

export function DashboardLayout({
  title,
  userName,
  nav,
  children,
  topbarTitle,
  topbarActions,
  footer,
  className,
}: {
  title: string;
  userName?: string;
  nav: DashboardNavGroup[];
  children: React.ReactNode;
  topbarTitle?: string;
  topbarActions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function onLogout() {
    const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    const redirectTo = typeof data?.redirectTo === "string" ? data.redirectTo : "/";
    router.push(redirectTo);
    router.refresh();
  }

  const defaultFooter = (
    <div className="space-y-3">
      {userName ? (
        <>
          <div className="text-xs text-muted-foreground">Logged in as</div>
          <div className="text-sm font-medium truncate">{userName}</div>
        </>
      ) : null}
      <Button type="button" variant="outline" className="w-full" onClick={onLogout}>
        Logout
      </Button>
    </div>
  );

  return (
    <div className={cn("min-h-[calc(100vh-0px)] bg-background md:min-h-screen md:flex", className)}>
      <Sidebar title={title} footer={footer ?? defaultFooter}>
        {nav.map((group) => (
          <SidebarGroup key={group.title} title={group.title}>
            {group.items.map((it) => (
              <SidebarItem
                key={it.href}
                href={it.href}
                label={it.label}
                match={it.match ?? "prefix"}
                badge={it.badge}
              />
            ))}
          </SidebarGroup>
        ))}
      </Sidebar>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:px-6 md:py-3">
            <div className="md:hidden">
              <SidebarToggleButton />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-heading text-base md:text-lg tracking-tight truncate">
                {topbarTitle ?? title}
              </div>
              <div className="hidden md:block text-xs text-muted-foreground truncate">
                {pathname}
              </div>
            </div>

            {topbarActions ? <div className="order-3 flex w-full items-center gap-2 overflow-x-auto pb-1 sm:order-0 sm:w-auto sm:overflow-visible sm:pb-0">{topbarActions}</div> : null}
          </div>
        </div>

        <main className="mx-auto w-full px-3 py-3 mobile-bottom-safe sm:px-4 md:px-6 md:py-6">
          {topbarTitle ? (
            <div className="mb-6">
              <div className="text-2xl font-semibold">{topbarTitle}</div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
