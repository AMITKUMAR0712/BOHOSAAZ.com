"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelSidebar, type PanelNavGroup } from "@/components/panel/PanelSidebar";
import { PanelTopbar, type PanelRole } from "@/components/panel/PanelTopbar";

export function PanelLayout({
  sidebarTitle,
  topbarTitle,
  role,
  userName,
  nav,
  topbarActions,
  children,
  className,
}: {
  sidebarTitle: string;
  topbarTitle: string;
  role: PanelRole;
  userName: string;
  nav: PanelNavGroup[];
  topbarActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-[calc(100vh-0px)] md:min-h-screen md:flex", className)}>
      <PanelSidebar title={sidebarTitle} nav={nav} />

      <div className="flex-1 min-w-0">
        <PanelTopbar title={topbarTitle} userName={userName} role={role} actions={topbarActions} />
        <PanelShell>{children}</PanelShell>
      </div>
    </div>
  );
}
