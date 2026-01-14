import * as React from "react";
import { cn } from "@/lib/cn";

export function PanelShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <main className={cn("mx-auto w-full px-4 py-6 md:px-6", className)}>{children}</main>;
}
