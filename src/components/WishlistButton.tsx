"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 21s-7.2-4.6-9.5-9.4C1 8.1 3.3 5 6.9 5c1.9 0 3.6 1 5.1 2.7C13.5 6 15.2 5 17.1 5 20.7 5 23 8.1 21.5 11.6 19.2 16.4 12 21 12 21Z" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.5-9.2-9A5.4 5.4 0 0 1 12 5.7 5.4 5.4 0 0 1 21.2 11C19 15.5 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WishlistButton({
  productId,
  langPrefix,
  className,
}: {
  productId: string;
  langPrefix: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [wished, setWished] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, {
          credentials: "include",
          cache: "no-store",
        }).catch(() => null);
        if (!res || !res.ok) return;
        const data: unknown = await res.json().catch(() => null);
        if (data && typeof data === "object" && "wished" in data) {
          setWished(Boolean((data as { wished?: unknown }).wished));
        }
      })();
    }, 0);
    return () => clearTimeout(t);
  }, [productId]);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const next = !wished;
      const res = await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 401) {
        const nextUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : langPrefix;
        toast({ variant: "warning", title: "Login required", message: "Please login to use wishlist." });
        window.location.href = `${langPrefix}/login?next=${encodeURIComponent(nextUrl)}`;
        return;
      }

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err =
          data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Wishlist update failed";
        throw new Error(err);
      }

      window.dispatchEvent(new Event("bohosaaz-wishlist"));
      setWished(next);
      toast({
        variant: "success",
        title: next ? "Added to wishlist" : "Removed from wishlist",
        message: next ? "Saved for later." : "Removed." ,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Wishlist update failed";
      toast({ variant: "danger", title: "Wishlist", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={cn(
        "h-10 w-10 grid place-items-center rounded-(--radius) border border-border bg-card hover:bg-muted/40 transition-colors",
        wished ? "text-primary" : "text-foreground",
        className,
      )}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      onClick={toggle}
      disabled={loading}
    >
      <HeartIcon filled={wished} />
    </button>
  );
}
