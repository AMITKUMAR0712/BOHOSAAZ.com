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
        "h-full min-h-28 rounded-3xl border border-border bg-card/90 p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {loading ? (
                <div className="h-8 w-24 rounded bg-muted animate-pulse" />
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
            "flex h-12 w-12 items-center justify-center rounded-3xl border border-border bg-primary/10 text-primary transition-colors",
            loading && "animate-pulse",
          )}>
            {icon}
          </div>
        </div>
      </Card>
    </Link>
  );
}
