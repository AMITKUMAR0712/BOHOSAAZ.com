import * as React from "react";
import { cn } from "@/lib/cn";

export function PanelShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-7xl px-3 py-3 mobile-bottom-safe sm:px-4 md:px-6 md:py-5", className)}>
      {children}
    </main>
  );
}
