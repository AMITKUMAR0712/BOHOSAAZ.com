"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export function Sidebar({
  title,
  children,
  footer,
  className,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Mobile trigger (shown by layouts) */}
      <Drawer open={open} onOpenChange={setOpen} side="left" title={title}>
        <div className="space-y-6">
          <div className="space-y-6">{children}</div>
          {footer ? <div className="border-t border-border pt-4">{footer}</div> : null}
        </div>
      </Drawer>

      <aside className={cn("hidden md:flex md:w-72 md:flex-col md:border-r md:border-border md:bg-card", className)}>
        <div className="px-5 py-4 border-b border-border">
          <div className="font-heading text-lg tracking-tight">{title}</div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-6">{children}</div>
        </div>
        {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
      </aside>

      {/* Provide a tiny helper for mobile buttons */}
      <SidebarMobileButton open={open} onOpenChange={setOpen} />
    </>
  );
}

function SidebarMobileButton({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // This component intentionally renders nothing; it only exposes context via data attributes
  // for layout-level buttons to use (keeps Sidebar.tsx as the single owner of Drawer state).
  // Layouts can query for [data-sidebar-mobile] if they need, but typically they should render
  // their own button and pass an onClick that calls window.dispatchEvent.
  React.useEffect(() => {
    function onToggle() {
      onOpenChange(!open);
    }
    window.addEventListener("bohosaaz:sidebar-toggle", onToggle);
    return () => window.removeEventListener("bohosaaz:sidebar-toggle", onToggle);
  }, [open, onOpenChange]);

  return <span data-sidebar-mobile="1" className="hidden" />;
}

export function SidebarToggleButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={() => window.dispatchEvent(new Event("bohosaaz:sidebar-toggle"))}
    >
      Menu
    </Button>
  );
}
