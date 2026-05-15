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
    <div className={cn("min-h-[calc(100vh-0px)] md:min-h-screen md:flex", className)}>
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

      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="mx-auto w-full px-4 py-3 md:px-6 flex items-center gap-3">
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

            {topbarActions ? <div className="flex items-center gap-2">{topbarActions}</div> : null}
          </div>
        </div>

        <main className="mx-auto w-full px-4 py-6 md:px-6">
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
