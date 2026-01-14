"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type KpiCardProps = {
  label: string;
  value: string | number;
  href: string;
  icon: React.ReactNode;
  updatedText: string;
  loading?: boolean;
};

export function KpiCard({ label, value, href, icon, updatedText, loading }: KpiCardProps) {
  return (
    <Link href={href} className="block">
      <Card className={cn(
        "h-full min-h-24 p-5 transition-colors hover:bg-muted/30",
        "shadow-sm hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">
              {loading ? (
                <div className="h-7 w-20 rounded bg-muted animate-pulse" />
              ) : (
                <span className="truncate">{value}</span>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {loading ? (
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
              ) : (
                updatedText
              )}
            </div>
          </div>
          <div className={cn(
            "shrink-0 rounded-(--radius) border border-border bg-muted/30 p-2",
            loading && "animate-pulse",
          )}>
            {icon}
          </div>
        </div>
      </Card>
    </Link>
  );
}
