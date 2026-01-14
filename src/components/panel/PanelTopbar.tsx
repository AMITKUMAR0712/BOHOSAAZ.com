"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarToggleButton } from "@/components/sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type PanelRole = "USER" | "VENDOR" | "ADMIN";

function roleLabel(role: PanelRole) {
  if (role === "ADMIN") return "Admin";
  if (role === "VENDOR") return "Vendor";
  return "User";
}

export function PanelTopbar({
  title,
  userName,
  role,
  actions,
  className,
}: {
  title: string;
  userName: string;
  role: PanelRole;
  actions?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = React.useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/login");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <div className={cn("sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl", className)}>
      <div className="mx-auto w-full px-4 py-3 md:px-6 flex items-center gap-3">
        <div className="md:hidden">
          <SidebarToggleButton />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-heading text-base md:text-lg tracking-tight truncate">{title}</div>
          <div className="hidden md:block text-xs text-muted-foreground truncate">{pathname}</div>
        </div>

        {actions ? <div className="hidden md:flex items-center gap-2">{actions}</div> : null}

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-border bg-accent/20 px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-foreground">
            {roleLabel(role)}
          </span>
          <div className="hidden sm:block text-xs text-muted-foreground">Logged in as:</div>
          <div className="hidden sm:block text-sm font-medium max-w-56 truncate">{userName}</div>
          <Button size="sm" variant="outline" onClick={onLogout} disabled={loading}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
