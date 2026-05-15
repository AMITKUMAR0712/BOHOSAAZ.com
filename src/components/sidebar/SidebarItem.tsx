"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

type MatchMode = "exact" | "prefix";

export function SidebarItem({
  href,
  label,
  icon,
  badge,
  match = "prefix",
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | null;
  match?: MatchMode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (() => {
    if (!pathname) return false;
    if (match === "exact") return pathname === href;
    if (pathname === href) return true;
    return pathname.startsWith(href + "/");
  })();

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        "hover:bg-muted/60",
        isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span
            className={cn(
              "shrink-0",
              isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <span className={cn("truncate", isActive ? "font-medium" : "font-normal")}>{label}</span>
      </span>
      {typeof badge === "number" && badge > 0 ? (
        <Badge variant={isActive ? "default" : "secondary"} className="shrink-0">
          {badge}
        </Badge>
      ) : null}
    </Link>
  );
}
