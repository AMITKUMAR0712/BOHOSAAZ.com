"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type ToastVariant = "default" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => setMounted(true), []);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = { id, ...t };
    setItems((prev) => [...prev, item]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted
        ? createPortal(
            <div className="fixed inset-x-0 bottom-0 z-50 p-4">
              <div className="mx-auto flex w-full max-w-md flex-col gap-2">
                {items.map((t) => {
                  const variantClass =
                    t.variant === "success"
                      ? "border-success/40 bg-card"
                      : t.variant === "warning"
                        ? "border-warning/50 bg-card"
                        : t.variant === "danger"
                          ? "border-danger/50 bg-card"
                          : "border-border bg-card";

                  const barClass =
                    t.variant === "success"
                      ? "bg-success"
                      : t.variant === "warning"
                        ? "bg-warning"
                        : t.variant === "danger"
                          ? "bg-danger"
                          : "bg-primary";

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "relative overflow-hidden rounded-[var(--radius)] border p-3 shadow-sm",
                        variantClass,
                      )}
                    >
                      <div className={cn("absolute left-0 top-0 h-full w-1", barClass)} />
                      {t.title ? (
                        <div className="text-sm font-semibold">{t.title}</div>
                      ) : null}
                      <div className="text-sm text-muted-foreground">{t.message}</div>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
