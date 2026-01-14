import * as React from "react";
import { cn } from "@/lib/cn";

export function SidebarGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
